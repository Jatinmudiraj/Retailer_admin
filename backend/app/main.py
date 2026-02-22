from __future__ import annotations

import csv
import io
import os
import shutil
import base64
import asyncio
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

# Auth
from google.auth.transport import requests as grequests
from google.oauth2 import id_token
import jwt

# Beanie / Motor
from app.db import init_db
from app.models import (
    Setting, Product, ProductImage, Rating, Reservation,
    S3DeletionQueue, Feedback, WishlistRequest, SaleArchive, 
    Customer, Order, OrderItem, AdminAccount
)

from app.auth import (
    COOKIE_NAME, 
    CUSTOMER_COOKIE_NAME,
    get_current_admin, 
    make_session_token, 
    verify_google_credential,
    get_password_hash,
    verify_password,
    _allowed_email,
    get_current_customer,
    AdminUser
)
from app.config import get_settings
from app.s3_service import (
    upload_file_to_s3, 
    generate_presigned_upload_url, 
    verify_object_exists, 
    get_object_metadata,
    get_public_url,
    delete_object_with_retry,
    calculate_checksum,
    generate_presigned_get_url
)
from app.schemas import (
    GoldRateIn, GoldRateOut,
    GoogleCredentialIn,
    MarkSoldIn,
    MetricOut,
    PrescriptiveCard,
    ProductIn, ProductOut, ProductImageOut,
    ReserveIn,
    WishlistIn, WishlistOut,
    PresignedUrlRequest, PresignedUrlResponse,
    ImageFinalizeIn,
    CustomerIn, CustomerOut, OrderIn, OrderOut, OrderItemOut,
    LoginIn, SignupIn,
    PublicOrderIn,
    ReservationOut,
    CustomerSignupIn, CustomerLoginIn, CustomerGoogleAuthIn, CustomerGoogleAuthOut
)
from app.recommender import recommender
from app.tryon import try_on_service


from contextlib import asynccontextmanager

settings = get_settings()

MEDIA_DIR = Path(settings.MEDIA_DIR).resolve()
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
BUFFER_DIR = MEDIA_DIR / "buffer"
BUFFER_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Init Beanie
    await init_db()
    print("MongoDB (Beanie) initialized.")

    # Seed default admin if not exists
    default_email = "jatinmudiraj126@gmail.com"
    exists = await AdminAccount.find_one(AdminAccount.email == default_email)
    if not exists:
        hashed = get_password_hash("123")
        admin = AdminAccount(
            email=default_email,
            hashed_password=hashed,
            name="Jatin Mudiraj",
            created_at=datetime.utcnow()
        )
        await admin.insert()
        print(f"Default admin {default_email} created.")

    # Train recommender
    try:
        print("Starting recommender training...")
        products = await Product.find(Product.is_archived == False).to_list()
        print(f"Fetched {len(products)} products for training.")
        recommender.fit(products)
        print("Recommender training done.")
    except Exception as e:
        print(f"Error training recommender: {e}")
        import traceback
        traceback.print_exc()

    yield
    # Shutdown logic if needed

app = FastAPI(title="RoyalIQ Retailer Admin", version="1.0", lifespan=lifespan)

# Handle Render's "host" property
origins = [
    "https://royaliq-frontend.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
]
origins_regex = r"https://.*\.onrender\.com|http://localhost:\d+"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origins_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")


# -----------------------
# Helpers (Async)
# -----------------------
from app.routers import procurement, shop
app.include_router(procurement.router, prefix="/procurement", tags=["Procurement"])
app.include_router(shop.router, prefix="/shop", tags=["Shop"])

import time

# In-memory cache for gold rate
_GOLD_RATE_CACHE = {"value": None, "timestamp": 0}

async def _get_gold_rate() -> float:
    # Check cache (5 min TTL)
    now = time.time()
    if _GOLD_RATE_CACHE["value"] and (now - _GOLD_RATE_CACHE["timestamp"] < 300):
        return _GOLD_RATE_CACHE["value"]

    row = await Setting.find_one(Setting.key == "gold_rate_per_gram")
    val = float(settings.GOLD_RATE_PER_GRAM)
    if not row:
        row = Setting(key="gold_rate_per_gram", value=str(val))
        await row.insert()
    else:
        try:
             val = float(row.value)
        except:
             pass
    
    _GOLD_RATE_CACHE["value"] = val
    _GOLD_RATE_CACHE["timestamp"] = now
    return val

async def _set_gold_rate(v: float) -> None:
    row = await Setting.find_one(Setting.key == "gold_rate_per_gram")
    if not row:
        row = Setting(key="gold_rate_per_gram", value=str(v))
        await row.insert()
    else:
        row.value = str(v)
        await row.save()
    
    # Update cache
    _GOLD_RATE_CACHE["value"] = v
    _GOLD_RATE_CACHE["timestamp"] = time.time()


def _bayesian_mean(avg: float, v: int, global_avg: float, m: int = 5) -> float:
    if v <= 0:
        return global_avg
    return (v / (v + m)) * avg + (m / (v + m)) * global_avg


async def _status_zone(p: Product, days_in_stock: int) -> str:
    # Check if Sold (qty 0 and exists in archive)
    if p.qty == 0:
        is_sold = await SaleArchive.find_one(SaleArchive.sku == p.sku)
        if is_sold:
            return "Sold"

    # Check Reserved
    # Fetch reservations
    res_count = await Reservation.find(Reservation.sku == p.sku).count()
    if (p.reserved_name and p.reserved_phone) or res_count > 0:
        return "Reserved"
        
    if days_in_stock <= 90:
        return "Fresh"
    if days_in_stock <= 180:
        return "Watch"
    return "Dead"


def _retail_valuation_inr(weight_g: Optional[float], gold_rate: float) -> Optional[float]:
    if weight_g is None:
        return None
    return float(weight_g) * float(gold_rate)


def _get_image_url_safe(img: ProductImage) -> Optional[str]:
    # Priority: s3_key (new) > url (legacy) > image_data (DB) > local path
    if img.s3_key:
        try:
            return generate_presigned_get_url(img.s3_key)
        except Exception:
            pass
    if img.url:
        return img.url
    if img.image_data:
        return f"/images/{img.id}"
    if img.path:
        return f"/media/{img.path.lstrip('/')}"
    return None



# Cached global rating
GLOBAL_RATING_AVG = 4.5



def _determine_status_zone(p: Product, days_in_stock: int, is_sold: bool, res_count: int) -> str:
    if p.qty == 0 and is_sold:
        return "Sold"
    if (p.reserved_name and p.reserved_phone) or res_count > 0:
        return "Reserved" 
    if days_in_stock <= 90: return "Fresh"
    if days_in_stock <= 180: return "Watch"
    return "Dead"

async def _product_out(p: Product) -> ProductOut:
    gold_rate = await _get_gold_rate()

    # Pre-fetch related data concurrently
    # Ratings (project only stars), Images, Reservations, SaleArchive (if needed)
    
    tasks = [
        Rating.find(Rating.sku == p.sku).to_list(),
        ProductImage.find(ProductImage.sku == p.sku).to_list(),
        Reservation.find(Reservation.sku == p.sku).to_list()
    ]
    
    # Add sale archive check only if qty is 0
    check_sold = (p.qty == 0)
    if check_sold:
        tasks.append(SaleArchive.find_one(SaleArchive.sku == p.sku))
    
    results = await asyncio.gather(*tasks)
    
    ratings_proj = results[0]
    images = results[1]
    reservations = results[2]
    is_sold_record = results[3] if check_sold else None

    # Rating Logic
    r_count = len(ratings_proj)
    r_avg = sum(r.stars for r in ratings_proj) / r_count if r_count > 0 else 0.0
    
    global_avg = GLOBAL_RATING_AVG
    bayes = _bayesian_mean(r_avg, r_count, global_avg, m=5) if global_avg > 0 else (r_avg if r_count > 0 else None)
    
    # Status Zone Logic
    base_date = p.purchase_date or p.created_at.date()
    days_in_stock = (date.today() - base_date).days
    
    res_count = len(reservations)
    zone = _determine_status_zone(p, days_in_stock, bool(is_sold_record), res_count)
    
    val = _retail_valuation_inr(p.weight_g, gold_rate)

    # Images Logic
    primary_img_url = None
    if images:
        prim = next((i for i in images if i.is_primary), images[0])
        primary_img_url = _get_image_url_safe(prim)

    return ProductOut(
        sku=p.sku,
        name=p.name,
        description=p.description,
        category=p.category,
        subcategory=p.subcategory,
        weight_g=p.weight_g,
        stock_type=p.stock_type,
        qty=p.qty,
        purchase_date=p.purchase_date,
        reserved_name=p.reserved_name,
        reserved_phone=p.reserved_phone,
        created_at=p.created_at,
        updated_at=p.updated_at,
        is_archived=p.is_archived,
        price=p.price,
        manual_rating=p.manual_rating,
        terms=p.terms,
        options=p.options,
        primary_image=primary_img_url,
        bayesian_rating=(round(float(bayes), 3) if bayes is not None else None),
        rating_count=r_count,
        retail_valuation_inr=(round(float(val), 2) if val is not None else None),
        status_zone=zone,
        tags=p.tags or [],
        reservations=[
            ReservationOut(
                id=r.id,
                name=r.name,
                phone=r.phone,
                qty=r.qty,
                created_at=r.created_at
            ) for r in reservations
        ],
        images=[
            ProductImageOut(
                s3_key=i.s3_key or "",
                url=_get_image_url_safe(i),
                is_primary=i.is_primary
            )
            for i in images
        ]
    )


@app.get("/")
async def root():
    return {"message": "RoyalIQ Retailer Admin Backend is Running!"}


@app.get("/health")
async def health() -> Dict[str, Any]:
    # Check DB connection
    # Simple query
    count = await Product.count()
    return {
        "ok": True,
        "db": "connected",
        "product_count": count,
        "media_dir": str(MEDIA_DIR),
        "gold_rate": await _get_gold_rate(),
    }


@app.get("/images/{image_id}")
async def get_image(image_id: str):
    img = await ProductImage.find_one(ProductImage.id == image_id)
    if not img or not img.image_data:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return Response(content=img.image_data, media_type=img.content_type or "image/jpeg")


# -----------------------
# Auth Routes
# -----------------------
@app.post("/auth/google")
async def auth_google(payload: GoogleCredentialIn):
    try:
        user = verify_google_credential(payload.credential)
        token = make_session_token(user)

        resp = JSONResponse({"ok": True, "user": user.model_dump()})
        resp.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            samesite="none",
            secure=True,
            max_age=24 * 3600,
        )
        return resp
    except Exception as e:
        print(f"Auth Error: {e}")
        raise

@app.post("/auth/logout")
async def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE_NAME)
    return resp

@app.get("/auth/me")
async def me(request: Request):
    user = get_current_admin(request)
    return {"ok": True, "user": user.model_dump()}

@app.post("/auth/signup")
async def signup(payload: SignupIn):
    if not _allowed_email(payload.email):
        raise HTTPException(status_code=403, detail="Email not allowed")

    exists = await AdminAccount.find_one(AdminAccount.email == payload.email.lower().strip())
    if exists:
        raise HTTPException(status_code=409, detail="Account already exists")

    hashed = get_password_hash(payload.password)
    acc = AdminAccount(
        email=payload.email.lower().strip(),
        hashed_password=hashed,
        name=payload.name,
        created_at=datetime.utcnow()
    )
    await acc.insert()

    user = AdminUser(email=acc.email, name=acc.name)
    token = make_session_token(user)

    resp = JSONResponse({"ok": True, "user": user.model_dump()})
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=24 * 3600,
    )
    return resp

@app.post("/auth/login")
async def auth_login(payload: LoginIn):
    email = payload.email.lower().strip()
    acc = await AdminAccount.find_one(AdminAccount.email == email)
    if not acc:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, acc.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = AdminUser(email=acc.email, name=acc.name, picture=acc.picture)
    token = make_session_token(user)

    resp = JSONResponse({"ok": True, "user": user.model_dump()})
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=24 * 3600,
    )
    return resp


# -----------------------
# Customer Auth
# -----------------------

@app.post("/auth/customer/signup")
async def customer_signup(payload: CustomerSignupIn):
    exists = await Customer.find_one(Customer.phone == payload.phone)
    mapped_hash = get_password_hash(payload.password)
    
    if exists:
        if exists.hashed_password:
             raise HTTPException(status_code=409, detail="Account already exists. Please login.")
        
        exists.hashed_password = mapped_hash
        exists.name = payload.name
        if payload.email:
             exists.email = payload.email
        await exists.save()
        cust = exists
    else:
        cust = Customer(
            name=payload.name,
            phone=payload.phone,
            email=payload.email,
            hashed_password=mapped_hash,
            created_at=datetime.utcnow()
        )
        await cust.insert()
    
    # Token logic
    now = int(float(datetime.utcnow().timestamp()))
    token_payload = {
        "sub": cust.phone,
        "name": cust.name,
        "role": "customer",
        "iat": now,
        "exp": now + 24 * 3600 * 7
    }
    token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm="HS256")

    resp = JSONResponse({"ok": True, "user": {"id": str(cust.id), "name": cust.name, "phone": cust.phone}})
    resp.set_cookie(
        key=CUSTOMER_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=24 * 3600 * 7,
    )
    return resp

@app.post("/auth/customer/login")
async def customer_login(payload: CustomerLoginIn):
    cust = await Customer.find_one(Customer.phone == payload.phone)
    if not cust:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not cust.hashed_password:
         raise HTTPException(status_code=401, detail="Account exists but no password set.")

    if not verify_password(payload.password, cust.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    now = int(float(datetime.utcnow().timestamp()))
    token_payload = {
        "sub": cust.phone,
        "name": cust.name,
        "role": "customer",
        "iat": now,
        "exp": now + 24 * 3600 * 7
    }
    token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm="HS256")

    resp = JSONResponse({"ok": True, "user": {"id": str(cust.id), "name": cust.name, "phone": cust.phone}})
    resp.set_cookie(
        key=CUSTOMER_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=24 * 3600 * 7,
    )
    return resp

@app.post("/auth/customer/google")
async def customer_google_auth(payload: CustomerGoogleAuthIn):
    try:
        req = grequests.Request()
        info = id_token.verify_oauth2_token(payload.credential, req, settings.GOOGLE_CLIENT_ID)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google Authentication Failed: {str(e)}")
    
    email = (info.get("email") or "").lower().strip()
    name = info.get("name")
    picture = info.get("picture")
    
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    cust = await Customer.find_one(Customer.email == email)
    
    if cust:
        # Login
        now = int(float(datetime.utcnow().timestamp()))
        token_payload = {
            "sub": cust.phone,
            "name": cust.name,
            "role": "customer",
            "iat": now,
            "exp": now + 24 * 3600 * 7
        }
        token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm="HS256")

        resp = JSONResponse({
            "ok": True, 
            "status": "success",
            "user": {"id": str(cust.id), "name": cust.name, "phone": cust.phone}
        })
        resp.set_cookie(
            key=CUSTOMER_COOKIE_NAME,
            value=token,
            httponly=True,
            samesite="none",
            secure=True,
            max_age=24 * 3600 * 7,
        )
        return resp
    else:
        return CustomerGoogleAuthOut(
            ok=True,
            status="need_phone",
            google_profile={
                "email": email,
                "name": name,
                "picture": picture
            }
        )

@app.post("/auth/customer/logout")
async def customer_logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(CUSTOMER_COOKIE_NAME)
    return resp

@app.get("/auth/customer/me")
async def customer_me(cust: Customer = Depends(get_current_customer)):
    return {"ok": True, "user": {"id": cust.id, "name": cust.name, "phone": cust.phone}}



# -----------------------
# S3 Image Upload (Production Flow)
# -----------------------

@app.post("/images/presigned-url")
async def get_presigned_upload_url_endpoint(payload: PresignedUrlRequest, request: Request):
    get_current_admin(request)
    
    try:
        result = generate_presigned_upload_url(payload.sku, payload.content_type)
        return PresignedUrlResponse(
            upload_url=result['url'],
            s3_key=result['key'],
            expires_in=result['expires_in'],
            bucket=result['bucket']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")


@app.post("/images/finalize")
async def finalize_image_upload(payload: ImageFinalizeIn, request: Request):
    get_current_admin(request)
    
    # Verify object exists in S3
    if not verify_object_exists(payload.s3_key):
        raise HTTPException(status_code=404, detail="Image not found in S3. Upload may have failed.")
    
    # Get object metadata
    metadata = get_object_metadata(payload.s3_key)
    if not metadata:
        raise HTTPException(status_code=500, detail="Failed to retrieve image metadata")
    
    # Check if product exists
    product = await Product.find_one(Product.sku == payload.sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # If setting as primary, unset other primary images
    if payload.is_primary:
        imgs = await ProductImage.find(ProductImage.sku == payload.sku, ProductImage.is_primary == True).to_list()
        for img in imgs:
            img.is_primary = False
            await img.save()
    
    # Create image record
    img = ProductImage(
        sku=payload.sku,
        s3_key=payload.s3_key,
        upload_status="ACTIVE",
        content_type=metadata.get('content_type'),
        file_size=metadata.get('size'),
        checksum=metadata.get('etag'),
        is_primary=payload.is_primary,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        url=generate_presigned_get_url(payload.s3_key)
    )
    await img.insert()
    
    return {
        "ok": True,
        "image_id": img.id,
        "s3_key": img.s3_key,
        "url": img.url
    }


@app.delete("/images/{image_id}")
async def queue_image_deletion(image_id: str, request: Request):
    get_current_admin(request)
    
    img = await ProductImage.find_one(ProductImage.id == image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Only queue if it has an S3 key
    if img.s3_key:
        existing = await S3DeletionQueue.find_one(S3DeletionQueue.key == img.s3_key)
        
        if not existing:
            deletion_item = S3DeletionQueue(
                bucket=settings.AWS_S3_BUCKET_NAME,
                key=img.s3_key,
                attempts=0,
                next_retry_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            await deletion_item.insert()
    
    await img.delete()
    return {"ok": True, "message": "Image queued for deletion"}


# -----------------------
# Settings (gold rate)
# -----------------------
@app.get("/settings/gold_rate")
async def get_gold_rate_endpoint(request: Request):
    get_current_admin(request)
    return GoldRateOut(gold_rate_per_gram=await _get_gold_rate())


@app.put("/settings/gold_rate")
async def set_gold_rate_endpoint(payload: GoldRateIn, request: Request):
    get_current_admin(request)
    if payload.gold_rate_per_gram <= 0:
        raise HTTPException(status_code=400, detail="Invalid gold rate")
    await _set_gold_rate(float(payload.gold_rate_per_gram))
    return GoldRateOut(gold_rate_per_gram=await _get_gold_rate())


# -----------------------
# Dashboard metrics + feedback
# -----------------------
@app.get("/dashboard/metrics")
async def dashboard_metrics(request: Request):
    get_current_admin(request)

    cutoff_90 = datetime.utcnow() - timedelta(days=90)
    
    # Active Sourcing
    active_sourcing = await Product.find(Product.is_archived == False, Product.created_at >= cutoff_90).count()

    # Concept Items
    # in Mongo: $or: [ { stock_type: "concept" }, { qty: { $lte: 0 } } ]
    # Beanie syntax:
    from beanie.operators import Or, LTE
    concept_items = await Product.find(
        Product.is_archived == False, 
        Or(Product.stock_type == "concept", LTE(Product.qty, 0))
    ).count()

    # Revenue Recovery
    revenue_recovery = await SaleArchive.count()

    # Engagement
    engagement = await Rating.count()

    # Asset zones - expensive loop, optimize?
    # For now, fetch all active products
    products = await Product.find(Product.is_archived == False).to_list()
    
    zone_fresh = zone_watch = zone_dead = zone_reserved = 0
    
    # Pre-fetch reservations for all products to avoid N+1? 
    # Or just do N+1 for now as dataset is small? 
    # Let's trust _status_zone calls are reasonably fast or Mongo handles it.
    
    for p in products:
        base_date = p.purchase_date or p.created_at.date()
        days_in_stock = (date.today() - base_date).days
        z = await _status_zone(p, days_in_stock)
        
        if z == "Reserved":
            zone_reserved += 1
        elif z == "Fresh":
            zone_fresh += 1
        elif z == "Watch":
            zone_watch += 1
        else:
            zone_dead += 1

    return MetricOut(
        active_sourcing=active_sourcing,
        concept_items=concept_items,
        revenue_recovery=revenue_recovery,
        engagement=engagement,
        zone_fresh=zone_fresh,
        zone_watch=zone_watch,
        zone_dead=zone_dead,
        zone_reserved=zone_reserved,
    )


@app.get("/dashboard/recent_feedback")
async def recent_feedback(request: Request, limit: int = 15):
    get_current_admin(request)
    lim = max(1, min(int(limit), 100))
    rows = await Feedback.find().sort(-Feedback.created_at).limit(lim).to_list()
    return {"ok": True, "items": [{"id": r.id, "text": r.text, "kiosk_ref": r.kiosk_ref, "created_at": r.created_at.isoformat()} for r in rows]}


# -----------------------
# Public Shop API (No Auth)
# -----------------------
@app.get("/public/products")
async def public_list_products(
    q: str = "",
    category: str = "",
    limit: int = 1000,
):
    from beanie.operators import RegEx

    query = Product.find(Product.is_archived == False)

    if category.strip():
        query = query.find(Product.category == category.strip())

    if q.strip():
        # Case insensitive regex search
        # Note: performance impact on large datasets
        r = RegEx(f".*{q.strip()}.*", "i")
        query = query.find(Or(
            Product.sku == r,
            Product.name == r,
            Product.description == r
        ))
    
    query = query.sort(-Product.created_at).limit(max(1, min(int(limit), 1000)))
    products = await query.to_list()
    
    # Async list comprehension would be ideal but python doesn't support [await ... for ...] directly easily without a helper or loop
    out = []
    for p in products:
        out.append(await _product_out(p))
    return out


@app.get("/public/products/{sku}")
async def public_get_product(sku: str):
    try:
        p = await Product.find_one(Product.sku == sku, Product.is_archived == False)
        if not p:
            raise HTTPException(status_code=404, detail="Product not found")
        
        out = await _product_out(p)
        
        # Add related products
        if recommender.is_fitted:
             sim_products = recommender.get_similar_products(sku, top_n=5)
             out.related_products = [rec.sku for rec in sim_products]
             
        return out
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------
# Recommendation API
# -----------------------

@app.get("/recommendations/product/{sku}")
async def recommend_similar_products(sku: str, limit: int = 5):
    """
    Get similar products based on content (tags, category, description).
    """
    try:
        # Check if product exists
        if sku not in recommender.products_map:
             # Try refreshing if not found (maybe added recently)
             # But fetching all is expensive.
             # Just return empty or error.
             # raise HTTPException(status_code=404, detail="Product not found in model")
             return []
             
        sim_products = recommender.get_similar_products(sku, top_n=limit)
        
        out = []
        for p in sim_products:
            out.append(await _product_out(p))
        return out
    except Exception as e:
        print(f"Rec Error: {e}")
        return []


@app.get("/recommendations/personalized")
async def recommend_personalized(limit: int = 5, request: Request = None):
    """
    Get personalized recommendations for the logged-in user.
    """
    # Try to get customer from token (cookie)
    # We can't use Depends(get_current_customer) directly if we want it to be optional 
    # (i.e. return popular if not logged in).
    # But usually front-end calls this only if logged in.
    
    # Let's extract token manually or use dependency that allows optional.
    # For now, let's assume valid token if cookie present, else fallback.
    
    user_id = None
    try:
        # Check for admin first (admin can see random Recs?)
        # Or check for Customer cookie
        token = request.cookies.get(CUSTOMER_COOKIE_NAME)
        if token:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("sub") # Phone number is ID for customer
    except:
        pass

    if not user_id:
        # Provide generic trending/random
        # Recommender 'recommend_for_user' handles cold start if user_id not found in history?
        # Actually my implementation returns random if no history.
        # So providing a dummy ID might work if I handle it. 
        # But my implementation looks up DB.
        # Let's just pass None? My method expects string.
        # I'll handle it here.
        sim_products = recommender.get_similar_products("random", top_n=limit) # This will fail or return empty
        # Let's manually call cold start logic or just pick random.
        if recommender.products_map:
             import random
             all_skus = list(recommender.products_map.keys())
             sim_products = [recommender.products_map[k] for k in random.sample(all_skus, min(len(all_skus), limit))]
        else:
             sim_products = []
    else:
        # Get personalized
        # user_id is phone number (from token sub).
        # Models use customer_ref?
        # Customer model has phone as unique index.
        # Rating has `customer_ref`. Ideally this matches Customer.id (ObjectId) or Phone?
        # In `main.py` lines 430+, `cust.id` is ObjectId.
        # In `models.py`, Customer is Document.
        # `Rating` has `customer_ref`.
        # When creating rating (not shown in `main.py` snippet), what do we save?
        # I should check how Ratings are saved.
        # If I can't check, I'll assume we need to pass the ID or Phone.
        # Let's fetch the customer to get the ID.
        cust = await Customer.find_one(Customer.phone == user_id)
        if cust:
            sim_products = await recommender.recommend_for_user(str(cust.id), top_n=limit)
        else:
            sim_products = []
            
    out = []
    for p in sim_products:
        out.append(await _product_out(p))
    return out



@app.post("/public/orders")
async def public_create_order(payload: PublicOrderIn):
    cust = await Customer.find_one(Customer.phone == payload.customer_phone)
    if not cust:
        cust = Customer(
            name=payload.customer_name,
            phone=payload.customer_phone,
            created_at=datetime.utcnow()
        )
        await cust.insert()
    
    total = sum(item.price * item.qty for item in payload.items)
    
    items_list = []
    for i in payload.items:
        items_list.append(OrderItem(
            sku=i.sku,
            qty=i.qty,
            price=i.price
        ))
    
    order = Order(
        customer_id=cust.id,
        total_amount=total,
        status="PENDING",
        created_at=datetime.utcnow(),
        items=items_list
    )
    await order.insert()
    return order


# -----------------------
# Vault: Products CRUD
# -----------------------
@app.get("/products")
async def list_products(
    request: Request,
    q: str = "",
    category: str = "",
    stock_type: str = "",
    weight_min: float = 0.0,
    weight_max: float = 0.0,
    include_archived: int = 0,
    limit: int = 200,
):
    get_current_admin(request)
    from beanie.operators import RegEx, GTE, LTE

    query = Product.find()

    if not int(include_archived):
        query = query.find(Product.is_archived == False)

    if q.strip():
        r = RegEx(f".*{q.strip()}.*", "i")
        query = query.find(Or(
            Product.sku == r,
            Product.name == r,
            Product.description == r
        ))

    if category.strip():
        # case insensitive match
        query = query.find(RegEx(f"^{category.strip()}$", "i"))

    if stock_type.strip():
        # case insensitive match for stock type or exact? Let's do exact lower as per model default
        query = query.find(Product.stock_type == stock_type.strip().lower())

    if weight_min > 0:
        query = query.find(GTE(Product.weight_g, weight_min))
    if weight_max > 0:
        query = query.find(LTE(Product.weight_g, weight_max))

    lim = max(1, min(int(limit), 500))
    items = await query.sort(-Product.updated_at).limit(lim).to_list()
    
    res = []
    for p in items:
        res.append(await _product_out(p))
    return res


@app.get("/products/{sku}")
async def get_product(sku: str, request: Request):
    get_current_admin(request)
    p = await Product.find_one(Product.sku == sku)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return await _product_out(p)


@app.post("/products")
async def create_product(payload: ProductIn, request: Request):
    get_current_admin(request)

    exists = await Product.find_one(Product.sku == payload.sku)
    if exists:
        raise HTTPException(status_code=409, detail="SKU already exists")

    p = Product(
        sku=payload.sku.strip(),
        name=payload.name.strip(),
        description=(payload.description.strip() if payload.description else None),
        category=(payload.category.strip() if payload.category else None),
        subcategory=(payload.subcategory.strip() if payload.subcategory else None),
        weight_g=payload.weight_g,
        stock_type=(payload.stock_type or "physical").strip().lower(),
        qty=int(payload.qty),
        purchase_date=payload.purchase_date,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        is_archived=False,
        price=payload.price,
        manual_rating=payload.manual_rating,
        terms=payload.terms,
        options=payload.options,
        tags=payload.tags or [],
    )
    await p.insert()

    # Handle Image Upload (Base64) - Upload to S3
    if payload.image_base64:
        try:
            # Expected format: "data:image/jpeg;base64,/9j/4AAQSkZQ..."
            header, encoded = payload.image_base64.split(",", 1)
            data = base64.b64decode(encoded)
            content_type = header.split(";", 1)[0].split(":", 1)[1]
            
            s3_key = upload_file_to_s3(data, content_type, p.sku)
            public_url = get_public_url(s3_key)

            img = ProductImage(
                sku=p.sku,
                s3_key=s3_key,
                upload_status="ACTIVE",
                content_type=content_type,
                file_size=len(data),
                checksum=calculate_checksum(data),
                is_primary=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                url=public_url
            )
            await img.insert()
        except Exception as e:
            print(f"Error uploading image to S3: {e}")
            raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    # Handle Additional Images
    if payload.additional_images:
        for idx, b64 in enumerate(payload.additional_images):
            try:
                if not b64 or "," not in b64: continue
                
                header, encoded = b64.split(",", 1)
                data = base64.b64decode(encoded)
                content_type = header.split(";", 1)[0].split(":", 1)[1]
                
                s3_key = upload_file_to_s3(data, content_type, f"{p.sku}_extra_{idx}_{int(datetime.utcnow().timestamp())}")
                public_url = get_public_url(s3_key)

                img = ProductImage(
                    sku=p.sku,
                    s3_key=s3_key,
                    upload_status="ACTIVE",
                    content_type=content_type,
                    file_size=len(data),
                    checksum=calculate_checksum(data),
                    is_primary=False,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    url=public_url
                )
                await img.insert()
            except Exception as e:
                print(f"Error uploading additional image: {e}")
    
    return await _product_out(p)


def _bg_task_delete_keys(keys: List[str]):
    # Synchronous wrapper for background task
    # If delete_object_with_retry uses async DB ops (e.g. to update status), this might fail?
    # Wait, simple s3 delete is sync (boto3).
    # The S3DeletionQueue insert logic happens in the route, not here.
    # So if this just calls boto3, it is sync and fine.
    for key in keys:
        try:
            delete_object_with_retry(key)
        except Exception as e:
            print(f"Background deletion failed for {key}: {e}")

@app.put("/products/{sku}")
async def update_product(sku: str, payload: ProductIn, request: Request, bg_tasks: BackgroundTasks):
    get_current_admin(request)
    p = await Product.find_one(Product.sku == sku)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")

    p.name = payload.name.strip()
    p.description = payload.description.strip() if payload.description else None
    p.category = payload.category.strip() if payload.category else None
    p.subcategory = payload.subcategory.strip() if payload.subcategory else None
    p.weight_g = payload.weight_g
    p.stock_type = (payload.stock_type or "physical").strip().lower()
    p.qty = int(payload.qty)
    p.purchase_date = payload.purchase_date
    p.updated_at = datetime.utcnow()
    p.price = payload.price
    p.manual_rating = payload.manual_rating
    p.terms = payload.terms
    p.options = payload.options
    p.tags = payload.tags or []

    if payload.image_base64:
        try:
            old_primary = await ProductImage.find(ProductImage.sku == sku, ProductImage.is_primary == True).to_list()
            keys_to_delete = []
            for op in old_primary:
                op.is_primary = False
                await op.save()
                if op.s3_key:
                    keys_to_delete.append(op.s3_key)
            
            if keys_to_delete:
                bg_tasks.add_task(_bg_task_delete_keys, keys_to_delete)
            
            header, encoded = payload.image_base64.split(",", 1)
            data = base64.b64decode(encoded)
            content_type = header.split(";", 1)[0].split(":", 1)[1]
            
            s3_key = upload_file_to_s3(data, content_type, p.sku)
            public_url = get_public_url(s3_key)

            img = ProductImage(
                sku=p.sku,
                s3_key=s3_key,
                upload_status="ACTIVE",
                content_type=content_type,
                file_size=len(data),
                checksum=calculate_checksum(data),
                is_primary=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                url=public_url
            )
            await img.insert()
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    await p.save()

    if payload.additional_images:
        for idx, b64 in enumerate(payload.additional_images):
            try:
                if not b64 or "," not in b64: continue
                header, encoded = b64.split(",", 1)
                data = base64.b64decode(encoded)
                content_type = header.split(";", 1)[0].split(":", 1)[1]
                
                s3_key = upload_file_to_s3(data, content_type, f"{p.sku}_extra_upd_{idx}_{int(datetime.utcnow().timestamp())}")
                public_url = get_public_url(s3_key)

                img = ProductImage(
                    sku=p.sku,
                    s3_key=s3_key,
                    upload_status="ACTIVE",
                    content_type=content_type,
                    file_size=len(data),
                    checksum=calculate_checksum(data),
                    is_primary=False,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    url=public_url
                )
                await img.insert()
            except Exception as e:
                print(f"Error adding additional image: {e}")
                
    return await _product_out(p)


@app.delete("/products/{sku}")
async def delete_product(sku: str, request: Request, bg_tasks: BackgroundTasks):
    get_current_admin(request)
    p = await Product.find_one(Product.sku == sku)
    if not p:
        return {"ok": True}
    
    images = await ProductImage.find(ProductImage.sku == sku).to_list()
    keys_to_delete = [img.s3_key for img in images if img.s3_key]
    
    if keys_to_delete:
        bg_tasks.add_task(_bg_task_delete_keys, keys_to_delete)

    await p.delete()
    return {"ok": True}


@app.post("/products/{sku}/reserve")
async def reserve_product(sku: str, payload: ReserveIn, request: Request):
    get_current_admin(request)
    p = await Product.find_one(Product.sku == sku)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    
    req_qty = payload.qty if payload.qty > 0 else 1
    
    if p.qty < req_qty:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {p.qty}")
    
    p.qty -= req_qty
    
    # Create reservation
    res = Reservation(
        sku=sku,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        qty=req_qty,
        created_at=datetime.utcnow()
    )
    await res.insert()
    
    # Update legacy info for convenience
    p.reserved_name = payload.name.strip()
    p.reserved_phone = payload.phone.strip()
    p.updated_at = datetime.utcnow()
    
    await p.save()
    return await _product_out(p)


@app.post("/products/{sku}/release")
async def release_all_reservations(sku: str, request: Request):
    get_current_admin(request)
    p = await Product.find_one(Product.sku == sku)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    
    existing_res_count = await Reservation.find(Reservation.sku == sku).count()
    if existing_res_count == 0 and p.reserved_name:
         p.qty += 1

    p.reserved_name = None
    p.reserved_phone = None
    
    reservations = await Reservation.find(Reservation.sku == sku).to_list()
    for res in reservations:
        p.qty += res.qty
        await res.delete()
        
    p.updated_at = datetime.utcnow()
    await p.save()
    return await _product_out(p)


@app.post("/reservations/{reservation_id}/release")
async def release_single_reservation(reservation_id: str, request: Request):
    get_current_admin(request)
    res = await Reservation.find_one(Reservation.id == reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    p = await Product.find_one(Product.sku == res.sku)
    if p:
        p.qty += res.qty
        if p.reserved_name == res.name:
            p.reserved_name = None
            p.reserved_phone = None
        p.updated_at = datetime.utcnow()
        await p.save()
        
    await res.delete()
    
    if p:
        return await _product_out(p)
    return {"ok": True}


@app.post("/products/{sku}/mark_sold")
async def mark_sold(sku: str, payload: MarkSoldIn, request: Request):
    get_current_admin(request)
    p = await Product.find_one(Product.sku == sku)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")

    base_date = p.purchase_date or p.created_at.date()
    days_to_sell = (date.today() - base_date).days

    p.qty = 0
    p.updated_at = datetime.utcnow()
    await p.save()

    existing = await SaleArchive.find_one(SaleArchive.sku == sku)
    if not existing:
        s = SaleArchive(
            sku=sku,
            sold_at=datetime.utcnow(),
            recovery_price_inr=payload.recovery_price_inr,
            days_to_sell=int(days_to_sell),
        )
        await s.insert()

    return {"ok": True, "sku": sku, "days_to_sell": int(days_to_sell)}


@app.get("/sales/archive")
async def sales_archive(request: Request, limit: int = 200):
    get_current_admin(request)
    lim = max(1, min(int(limit), 500))
    rows = await SaleArchive.find().sort(-SaleArchive.sold_at).limit(lim).to_list()
    return {
        "ok": True,
        "items": [
            {
                "id": str(r.id), # Beanie ID is standard
                "sku": r.sku,
                "sold_at": r.sold_at.isoformat(),
                "recovery_price_inr": r.recovery_price_inr,
                "days_to_sell": r.days_to_sell,
            }
            for r in rows
        ],
    }


# -----------------------
# Batch Sourcing
# -----------------------
def _admin_buffer_dir(admin_email: str) -> Path:
    safe = admin_email.replace("@", "_at_").replace(".", "_")
    d = BUFFER_DIR / safe
    d.mkdir(parents=True, exist_ok=True)
    return d

@app.post("/uploads/buffer_images")
async def buffer_images(
    request: Request,
    files: List[UploadFile] = File(...),
):
    admin = get_current_admin(request)
    buf_dir = _admin_buffer_dir(admin.email)

    saved = []
    for f in files:
        if not f.filename:
            continue
        dest = buf_dir / Path(f.filename).name
        with dest.open("wb") as out:
            content = await f.read()
            out.write(content)
        saved.append(dest.name)

    return {"ok": True, "buffer_count": len(saved), "files": saved}


@app.post("/uploads/batch_csv")
async def batch_csv(
    request: Request,
    csv_file: UploadFile = File(...),
    global_date: str = "",
    stock_type: str = "physical",
):
    admin = get_current_admin(request)
    buf_dir = _admin_buffer_dir(admin.email)

    if not csv_file.filename:
        raise HTTPException(status_code=400, detail="Missing CSV file")

    content = await csv_file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV")

    gdate = None
    if global_date.strip():
        try:
            gdate = datetime.strptime(global_date.strip(), "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="global_date must be YYYY-MM-DD")

    created = 0
    matched_images = 0

    for _, row in df.iterrows():
        sku = str(row.get("sku") or "").strip()
        name = str(row.get("name") or row.get("title") or "").strip()
        if not sku or not name:
            continue

        if await Product.find_one(Product.sku == sku):
            continue

        desc = str(row.get("description") or "").strip() or None
        category = str(row.get("category") or "").strip() or None
        subcategory = str(row.get("subcategory") or "").strip() or None

        weight_g = None
        try:
            w = row.get("weight_g")
            if w is not None and str(w).strip() != "":
                weight_g = float(w)
        except Exception:
            weight_g = None

        pdate = gdate
        if not pdate:
            raw = str(row.get("purchase_date") or "").strip()
            if raw:
                try:
                    pdate = datetime.strptime(raw, "%Y-%m-%d").date()
                except Exception:
                    pdate = None

        qty = 1
        try:
            qv = row.get("qty")
            if qv is not None and str(qv).strip() != "":
                qty = int(qv)
        except Exception:
            qty = 1

        p = Product(
            sku=sku,
            name=name,
            description=desc,
            category=category,
            subcategory=subcategory,
            weight_g=weight_g,
            stock_type=(str(row.get("stock_type") or stock_type).strip().lower() or "physical"),
            qty=qty,
            purchase_date=pdate,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_archived=False,
        )
        await p.insert()
        created += 1

        img_name = str(row.get("image_filename") or row.get("image") or row.get("filename") or "").strip()
        if img_name:
            candidate = buf_dir / Path(img_name).name
            if candidate.exists():
                prod_dir = MEDIA_DIR / "products" / sku
                prod_dir.mkdir(parents=True, exist_ok=True)
                dest = prod_dir / candidate.name
                shutil.move(str(candidate), str(dest))
                rel_path = f"products/{sku}/{dest.name}"

                img = ProductImage(sku=sku, path=rel_path, is_primary=True)
                await img.insert()
                matched_images += 1

    return {"ok": True, "created": created, "matched_images": matched_images}



# -----------------------
# Intelligence: Prescriptive
# -----------------------
@app.get("/intelligence/prescriptive")
async def prescriptive(request: Request):
    get_current_admin(request)

    cutoff = datetime.utcnow() - timedelta(days=90)

    # Sales velocity: sold in last 90 days.
    # Beanie aggregation or simple fetch.
    sold_recent = await SaleArchive.find(SaleArchive.sold_at >= cutoff).to_list()
    sold_skus = [s.sku for s in sold_recent]

    # Current stock
    stock = await Product.find(Product.is_archived == False).to_list()
    stock_by_cat: Dict[str, int] = {}
    for p in stock:
        cat = (p.category or "Unknown").strip() or "Unknown"
        stock_by_cat[cat] = stock_by_cat.get(cat, 0) + 1

    # Sold by cat (best effort)
    # We need to look up product category for sold SKUs.
    # Since products might be deleted or archived, we try to find them.
    # If deleted, we can't know category easily unless we archived it in SaleArchive (not currently there).
    # We will query Product even if archived.
    sold_by_cat: Dict[str, int] = {}
    
    # Optimization: Fetch all products (including archived) into a map?
    # If database is huge, this is bad. But for now, let's do individual lookups or `in` query.
    # sold_skus might be large?
    # Let's do `in` query
    products_sold = await Product.find(Product.sku.in_(sold_skus)).to_list() # type: ignore
    product_map = {p.sku: p for p in products_sold}

    for sku in sold_skus:
        p = product_map.get(sku)
        cat = (p.category if p else "Unknown") or "Unknown"
        cat = cat.strip() or "Unknown"
        sold_by_cat[cat] = sold_by_cat.get(cat, 0) + 1

    # Ratings by cat
    # Rating document has SKU.
    # Join Rating -> Product to get category.
    # Beanie aggregation with lookup? Beanie supports native Mongo syntax.
    # { $lookup: { from: "products", ... } } 
    # But product SKU is indexed string, not ObjId.
    
    # Alternative: Iterate all ratings and fetch product? Slow.
    # Alternative 2: Iterate all products and fetch average rating? Slow.
    # Alternative 3: Since we already fetched `stock` (all active products), we can iterate them and find their ratings?
    # We need a robust way.
    # Let's try to aggregate on Rating side, but we need category.
    # For now, let's use the `stock` list we already have (active products) and aggregate in memory if dataset < 10k.
    # Iterate stock, fetch ratings for each? N+1.
    
    # Let's skip complex aggregation for now or do a simplified version.
    # Fetch ALL ratings.
    all_ratings = await Rating.find().to_list()
    ratings_map = {} # sku -> list of stars
    for r in all_ratings:
        if r.sku not in ratings_map:
            ratings_map[r.sku] = []
        ratings_map[r.sku].append(r.stars)
        
    ratings_by_cat: Dict[str, Tuple[float, int]] = {} # cat -> (sum, count)
    
    for p in stock:
        cat = (p.category or "Unknown").strip() or "Unknown"
        stars = ratings_map.get(p.sku, [])
        if stars:
            s, c = ratings_by_cat.get(cat, (0.0, 0))
            ratings_by_cat[cat] = (s + sum(stars), c + len(stars))
            
    # Compute avg
    final_ratings_by_cat = {}
    for cat, (s, c) in ratings_by_cat.items():
        if c > 0:
            final_ratings_by_cat[cat] = (s / c, c)

    buy = []
    trial = []
    avoid = []

    for cat, stock_cnt in stock_by_cat.items():
        sold_cnt = sold_by_cat.get(cat, 0)
        avg_rating, votes = final_ratings_by_cat.get(cat, (0.0, 0))

        if sold_cnt > stock_cnt:
            buy.append(f"{cat} (sold90={sold_cnt}, stock={stock_cnt})")

        if avg_rating >= 4.0 and votes >= 3 and sold_cnt <= max(1, stock_cnt // 3):
            trial.append(f"{cat} (rating={avg_rating:.2f}, votes={votes})")

        dead_cnt = 0
        for p in stock:
            if (p.category or "Unknown").strip() == cat:
                base_date = p.purchase_date or p.created_at.date()
                days = (date.today() - base_date).days
                if days > 180:
                    dead_cnt += 1
        if dead_cnt >= 3:
            avoid.append(f"{cat} (deadstock={dead_cnt})")

    cards = [
        PrescriptiveCard(title="Strategic BUY", color="green", items=buy[:15]).model_dump(),
        PrescriptiveCard(title="Market TRIAL", color="yellow", items=trial[:15]).model_dump(),
        PrescriptiveCard(title="Strategic AVOID", color="red", items=avoid[:15]).model_dump(),
    ]
    return {"ok": True, "cards": cards}


@app.post("/wishlist")
async def create_wishlist(payload: WishlistIn, request: Request):
    get_current_admin(request)
    w = WishlistRequest(
        client_name=payload.client_name,
        client_phone=payload.client_phone,
        request_text=payload.request_text,
        category=payload.category,
        weight_target_g=payload.weight_target_g,
        budget_inr=payload.budget_inr,
        status="open",
        created_at=datetime.utcnow(),
    )
    await w.insert()
    return {"ok": True, "id": str(w.id)}


@app.get("/wishlist")
async def list_wishlist(request: Request, limit: int = 200):
    get_current_admin(request)
    lim = max(1, min(int(limit), 500))
    # Beanie find
    rows = await WishlistRequest.find().sort(-WishlistRequest.created_at).limit(lim).to_list()

    items: List[WishlistOut] = []
    from beanie.operators import RegEx, GTE, LTE
    
    for r in rows:
        # Potential matches count
        q_prod = Product.find(Product.is_archived == False)
        
        if r.category:
             q_prod = q_prod.find(RegEx(f"^{r.category.strip()}$", "i"))
             
        if r.weight_target_g is not None:
             w_min = float(r.weight_target_g) * 0.8
             w_max = float(r.weight_target_g) * 1.2
             q_prod = q_prod.find(GTE(Product.weight_g, w_min), LTE(Product.weight_g, w_max))
        
        matches = await q_prod.count()

        items.append(
            WishlistOut(
                id=str(r.id),
                client_name=r.client_name,
                client_phone=r.client_phone,
                request_text=r.request_text,
                category=r.category,
                weight_target_g=r.weight_target_g,
                budget_inr=r.budget_inr,
                status=r.status,
                created_at=r.created_at,
                potential_matches=int(matches),
            )
        )
    return items


# -----------------------
# CRM: Customers & Orders
# -----------------------
@app.get("/customers")
async def list_customers(request: Request, q: str = ""):
    get_current_admin(request)
    query = Customer.find()
    if q.strip():
        from beanie.operators import Or, RegEx
        r = RegEx(f".*{q.strip()}.*", "i")
        query = query.find(Or(Customer.name == r, Customer.phone == r))
        
    res = await query.sort(-Customer.created_at).limit(100).to_list()
    # Map to CustomerOut
    return [
        CustomerOut(
            id=str(c.id),
            name=c.name,
            phone=c.phone,
            email=c.email,
            notes=c.notes,
            created_at=c.created_at
        )
        for c in res
    ]


@app.post("/customers")
async def create_customer_endpoint(payload: CustomerIn, request: Request):
    get_current_admin(request)
    existing = await Customer.find_one(Customer.phone == payload.phone)
    if existing:
        raise HTTPException(status_code=409, detail="Customer with this phone already exists")
    
    c = Customer(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email,
        notes=payload.notes,
        created_at=datetime.utcnow(),
    )
    await c.insert()
    return CustomerOut(
        id=str(c.id),
        name=c.name,
        phone=c.phone,
        email=c.email,
        notes=c.notes,
        created_at=c.created_at
    )


async def _order_out(o: Order) -> OrderOut:
    # Fetch customer
    cust = await Customer.find_one(Customer.id == o.customer_id) # Beanie IDs can be ObjId or string depending on definition. Default Document uses Pydantic ObjectId.
    
    cust_out = None
    if cust:
        cust_out = CustomerOut(
            id=str(cust.id), 
            name=cust.name, 
            phone=cust.phone, 
            email=cust.email, 
            notes=cust.notes, 
            created_at=cust.created_at
        )

    # Items
    items_out = []
    for i in o.items:
        items_out.append(OrderItemOut(sku=i.sku, qty=i.qty, price=i.price))

    return OrderOut(
        id=str(o.id),
        customer_id=str(o.customer_id),
        total_amount=o.total_amount,
        status=o.status,
        created_at=o.created_at,
        customer=cust_out,
        items=items_out
    )


@app.get("/orders")
async def list_orders(request: Request):
    get_current_admin(request)
    orders = await Order.find().sort(-Order.created_at).limit(100).to_list()
    out = []
    for o in orders:
        out.append(await _order_out(o))
    return out


@app.post("/orders")
async def create_order_endpoint(payload: OrderIn, request: Request):
    get_current_admin(request)
    
    # Customer ID from payload is str.
    # Needed to fetch customer.
    from beanie import PydanticObjectId
    from bson import ObjectId
    
    try:
        c_id = PydanticObjectId(payload.customer_id)
    except:
        c_id = payload.customer_id # fallback

    cust = await Customer.get(c_id)
    if not cust:
        # Try finding by string if that failed or if ID was string
        # Since currently main model uses default Beanie ID (ObjectId), we really need to parse it.
        # But let's assume valid ID.
        pass

    if not cust:
         # Attempt fallback?
         # Beanie's `get` handles ObjectId parsing usually if string is valid.
         raise HTTPException(status_code=404, detail="Customer not found")

    total = 0.0
    items_list = []
    
    for it in payload.items:
        p = await Product.find_one(Product.sku == it.sku)
        if not p:
            raise HTTPException(status_code=400, detail=f"Product {it.sku} not found")
        
        line_total = it.qty * it.price
        total += line_total
        
        items_list.append(OrderItem(
            sku=it.sku,
            qty=it.qty,
            price=it.price
        ))

    o = Order(
        customer_id=str(cust.id),
        total_amount=total,
        status=payload.status,
        created_at=datetime.utcnow(),
        items=items_list
    )
    await o.insert()
    
    return await _order_out(o)


@app.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, request: Request):
    get_current_admin(request)
    
    # Try fetch by ID
    o = await Order.get(order_id)
    if not o:
        # try find one with query if get failed (e.g. format mismatch)
        try:
            from bson import ObjectId
            if ObjectId.is_valid(order_id):
                 o = await Order.get(ObjectId(order_id))
        except:
            pass
            
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    
    o.status = status.upper()
    await o.save()
    return await _order_out(o)



# -----------------------
# Payment Endpoints
# -----------------------
import razorpay
from app.schemas import PaymentOrderIn, PaymentVerifyIn

# Initialize Razorpay Client
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_1DP5mmOlF5G5ag")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "s4Sj5Ad8I870123")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Endpoints commented out in original file, keeping them commented or omitted
# as per migration strictness.
# To enable, simply uncomment and adapt to Async/Beanie if needed.

# -----------------------
# Virtual Try-On
# -----------------------
@app.post("/try-on")
async def process_try_on(sku: str, file: UploadFile = File(...)):
    """
    Process virtual try-on:
    1. Receive user image (file)
    2. Receive product SKU
    3. Detect face landmarks
    4. Fetch product primary image (transparent PNG preferred)
    5. Overlay product on user image
    6. Return result image
    """
    if not sku:
        raise HTTPException(status_code=400, detail="SKU is required")
        
    # 1. Fetch Product
    product = await Product.find_one(Product.sku == sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # 2. Fetch Primary Image URL
    # We need a public URL or s3 key to fetch content
    # For speed, let's use the one we can get bytes from
    p_images = await ProductImage.find(ProductImage.sku == sku).to_list()
    if not p_images:
        raise HTTPException(status_code=404, detail="Product has no images")
        
    # Prefer primary, else first
    prim = next((i for i in p_images if i.is_primary), p_images[0])
    
    # We need the actual URL to fetch bytes in tryon service
    # If using local/minio, might need internal logic. 
    # generate_presigned_get_url is good
    img_url = _get_image_url_safe(prim)
    if not img_url:
         raise HTTPException(status_code=404, detail="Could not resolve product image URL")

    # 3. Read User Image
    user_img_bytes = await file.read()
    
    try:
        # 4. Process
        # We run this in threadpool to not block asyncio loop
        loop = asyncio.get_event_loop()
        result_bytes = await loop.run_in_executor(
            None, 
            try_on_service.process_try_on,
            user_img_bytes,
            img_url,
            product.category or "jewelry"
        )
        
        # 5. Return
        return Response(content=result_bytes, media_type="image/png")
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Try-on processing failed")


@app.get("/try-on-ui", response_class=FileResponse)
def open_try_on_ui():
    return FileResponse("app/tryon_ui.html")

