from __future__ import annotations

import csv
import io
import os
import shutil
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import base64
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.auth import (
    COOKIE_NAME, 
    get_current_admin, 
    make_session_token, 
    verify_google_credential,
    get_password_hash,
    verify_password,
    _allowed_email
)
from app.config import get_settings
from app.db import engine, get_db
from app.models import Base, Feedback, Product, ProductImage, Rating, SaleArchive, Setting, WishlistRequest, S3DeletionQueue, Customer, Order, OrderItem, AdminAccount
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
    GoldRateIn,
    GoldRateOut,
    GoogleCredentialIn,
    MarkSoldIn,
    MetricOut,
    PrescriptiveCard,
    ProductIn,
    ProductOut,
    ReserveIn,
    WishlistIn,
    WishlistOut,
    PresignedUrlRequest,
    PresignedUrlResponse,
    ImageFinalizeIn,
    CustomerIn, CustomerOut, OrderIn, OrderOut,
    LoginIn, SignupIn,
)

from contextlib import asynccontextmanager

settings = get_settings()

MEDIA_DIR = Path(settings.MEDIA_DIR).resolve()
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
BUFFER_DIR = MEDIA_DIR / "buffer"
BUFFER_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create DB tables
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created.")
        
        # Seed default admin if it doesn't exist
        with Session(engine) as db:
            default_email = "jatinmudiraj126@gmail.com"
            exists = db.query(AdminAccount).filter(AdminAccount.email == default_email).first()
            if not exists:
                hashed = get_password_hash("123")
                admin = AdminAccount(
                    email=default_email,
                    hashed_password=hashed,
                    name="Jatin Mudiraj",
                    created_at=datetime.utcnow()
                )
                db.add(admin)
                db.commit()
                print(f"Default admin {default_email} created.")
    except Exception as e:
        print(f"Error creating database tables or seeding: {e}")
    
    yield
    # Shutdown logic if needed

app = FastAPI(title="RoyalIQ Retailer Admin", version="1.0", lifespan=lifespan)

# Handle Render's "host" property (which lacks https://)
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


def _get_gold_rate(db: Session) -> float:
    row = db.query(Setting).filter(Setting.key == "gold_rate_per_gram").first()
    if not row:
        row = Setting(key="gold_rate_per_gram", value=str(settings.GOLD_RATE_PER_GRAM))
        db.add(row)
        db.commit()
        return float(settings.GOLD_RATE_PER_GRAM)
    try:
        return float(row.value)
    except Exception:
        return float(settings.GOLD_RATE_PER_GRAM)


def _set_gold_rate(db: Session, v: float) -> None:
    row = db.query(Setting).filter(Setting.key == "gold_rate_per_gram").first()
    if not row:
        row = Setting(key="gold_rate_per_gram", value=str(v))
        db.add(row)
    else:
        row.value = str(v)
    db.commit()


def _bayesian_mean(avg: float, v: int, global_avg: float, m: int = 5) -> float:
    if v <= 0:
        return global_avg
    return (v / (v + m)) * avg + (m / (v + m)) * global_avg


def _status_zone(p: Product, days_in_stock: int) -> str:
    if p.reserved_name and p.reserved_phone:
        return "Reserved"
    if days_in_stock <= 90:
        return "Fresh"
    if days_in_stock <= 180:
        return "Watch"
    return "Dead"


def _retail_valuation_inr(weight_g: Optional[float], gold_rate: float) -> Optional[float]:
    if weight_g is None:
        return None
    # Simple valuation. You can refine this later (making charges, GST, stone premiums).
    return float(weight_g) * float(gold_rate)


def _primary_image_url(db: Session, sku: str) -> Optional[str]:
    img = (
        db.query(ProductImage)
        .filter(ProductImage.sku == sku)
        .order_by(ProductImage.is_primary.desc())
        .first()
    )
    if not img:
        return None
    # Priority: s3_key (new) > url (legacy) > image_data (DB) > local path
    if img.s3_key:
        return generate_presigned_get_url(img.s3_key)
    if img.url:
        return img.url
    if img.image_data:
        return f"/images/{img.id}"
    return f"/media/{img.path.lstrip('/')}"


def _product_out(db: Session, p: Product) -> ProductOut:
    gold_rate = _get_gold_rate(db)

    # days in stock
    base_date = p.purchase_date or p.created_at.date()
    days_in_stock = (date.today() - base_date).days

    # rating stats
    r_q = db.query(func.count(Rating.id), func.avg(Rating.stars)).filter(Rating.sku == p.sku).first()
    r_count = int(r_q[0] or 0)
    r_avg = float(r_q[1] or 0.0)

    global_avg_q = db.query(func.avg(Rating.stars)).first()
    global_avg = float(global_avg_q[0] or 0.0) if global_avg_q else 0.0

    bayes = _bayesian_mean(r_avg, r_count, global_avg, m=5) if global_avg > 0 else (r_avg if r_count > 0 else None)
    zone = _status_zone(p, days_in_stock)
    val = _retail_valuation_inr(p.weight_g, gold_rate)

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
        primary_image=_primary_image_url(db, p.sku),
        bayesian_rating=(round(float(bayes), 3) if bayes is not None else None),
        rating_count=r_count,
        retail_valuation_inr=(round(float(val), 2) if val is not None else None),
        status_zone=zone,
    )


@app.get("/")
def root():
    return {"message": "RoyalIQ Retailer Admin Backend is Running!"}


@app.get("/health")
def health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {
        "ok": True,
        "db": "connected",
        "media_dir": str(MEDIA_DIR),
        "gold_rate": _get_gold_rate(db),
    }


@app.get("/images/{image_id}")
def get_image(image_id: str, db: Session = Depends(get_db)):
    img = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not img or not img.image_data:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return Response(content=img.image_data, media_type=img.content_type or "image/jpeg")


# -----------------------
# Auth
# -----------------------
import traceback

@app.post("/auth/google")
def auth_google(payload: GoogleCredentialIn):
    try:
        user = verify_google_credential(payload.credential)
        token = make_session_token(user)

        resp = JSONResponse({"ok": True, "user": user.model_dump()})
        resp.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            samesite="lax",
            secure=bool(int(settings.COOKIE_SECURE)),
            max_age=24 * 3600,
        )
        return resp
    except Exception as e:
        print(f"Auth Error: {e}")
        # Re-raise so FastAPI still returns 500
        raise


@app.post("/auth/logout")
def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE_NAME)
    return resp


@app.get("/auth/me")
def me(request: Request):
    user = get_current_admin(request)
    return {"ok": True, "user": user.model_dump()}


@app.post("/auth/signup")
def signup(payload: SignupIn, db: Session = Depends(get_db)):
    # 1. Check if allowed
    if not _allowed_email(payload.email):
        raise HTTPException(status_code=403, detail="Email not allowed for retailer admin")

    # 2. Check if exists
    exists = db.query(AdminAccount).filter(AdminAccount.email == payload.email.lower().strip()).first()
    if exists:
        raise HTTPException(status_code=409, detail="Account already exists")

    # 3. Create
    hashed = get_password_hash(payload.password)
    acc = AdminAccount(
        email=payload.email.lower().strip(),
        hashed_password=hashed,
        name=payload.name,
        created_at=datetime.utcnow()
    )
    db.add(acc)
    db.commit()

    user = AdminUser(email=acc.email, name=acc.name)
    token = make_session_token(user)

    resp = JSONResponse({"ok": True, "user": user.model_dump()})
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=bool(int(settings.COOKIE_SECURE)),
        max_age=24 * 3600,
    )
    return resp


@app.post("/auth/login")
def auth_login(payload: LoginIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    acc = db.query(AdminAccount).filter(AdminAccount.email == email).first()
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
        samesite="lax",
        secure=bool(int(settings.COOKIE_SECURE)),
        max_age=24 * 3600,
    )
    return resp


# -----------------------
# S3 Image Upload (Production Flow)
# -----------------------
@app.post("/images/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_upload_url(payload: PresignedUrlRequest, request: Request):
    """
    Generate a presigned URL for direct client upload to S3.
    Client uploads directly to S3, then calls /images/finalize.
    """
    _ = get_current_admin(request)
    
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
def finalize_image_upload(payload: ImageFinalizeIn, request: Request, db: Session = Depends(get_db)):
    """
    Finalize image upload after client has uploaded to S3.
    Verifies the object exists and saves metadata to database.
    """
    _ = get_current_admin(request)
    
    # Verify object exists in S3
    if not verify_object_exists(payload.s3_key):
        raise HTTPException(status_code=404, detail="Image not found in S3. Upload may have failed.")
    
    # Get object metadata
    metadata = get_object_metadata(payload.s3_key)
    if not metadata:
        raise HTTPException(status_code=500, detail="Failed to retrieve image metadata")
    
    # Check if product exists
    product = db.query(Product).filter(Product.sku == payload.sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # If setting as primary, unset other primary images
    if payload.is_primary:
        db.query(ProductImage).filter(
            ProductImage.sku == payload.sku,
            ProductImage.is_primary == True
        ).update({"is_primary": False})
    
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
        url=generate_presigned_get_url(payload.s3_key)  # Populate with signed URL initially (though dynamic is preferred)
    )
    db.add(img)
    db.commit()
    
    return {
        "ok": True,
        "image_id": img.id,
        "s3_key": img.s3_key,
        "url": img.url
    }


@app.delete("/images/{image_id}")
def queue_image_deletion(image_id: str, request: Request, db: Session = Depends(get_db)):
    """
    Queue an image for deletion. The actual S3 deletion happens asynchronously.
    """
    _ = get_current_admin(request)
    
    img = db.query(ProductImage).filter(ProductImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Only queue if it has an S3 key
    if img.s3_key:
        # Check if already queued
        existing = db.query(S3DeletionQueue).filter(
            S3DeletionQueue.key == img.s3_key
        ).first()
        
        if not existing:
            deletion_item = S3DeletionQueue(
                bucket=settings.AWS_S3_BUCKET_NAME,
                key=img.s3_key,
                attempts=0,
                next_retry_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            db.add(deletion_item)
    
    # Delete image record from database
    db.delete(img)
    db.commit()
    
    return {"ok": True, "message": "Image queued for deletion"}


# -----------------------
# Settings (gold rate)
# -----------------------
@app.get("/settings/gold_rate", response_model=GoldRateOut)
def get_gold_rate(request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    return GoldRateOut(gold_rate_per_gram=_get_gold_rate(db))


@app.put("/settings/gold_rate", response_model=GoldRateOut)
def set_gold_rate(payload: GoldRateIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    if payload.gold_rate_per_gram <= 0:
        raise HTTPException(status_code=400, detail="Invalid gold rate")
    _set_gold_rate(db, float(payload.gold_rate_per_gram))
    return GoldRateOut(gold_rate_per_gram=_get_gold_rate(db))


# -----------------------
# Dashboard metrics + feedback
# -----------------------
@app.get("/dashboard/metrics", response_model=MetricOut)
def dashboard_metrics(request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)

    cutoff_90 = datetime.utcnow() - timedelta(days=90)
    cutoff_180 = datetime.utcnow() - timedelta(days=180)

    # Active Sourcing: items created within 90 days and not archived
    active_sourcing = db.query(Product).filter(Product.is_archived == False, Product.created_at >= cutoff_90).count()

    # Concept Items: stock_type=concept OR qty=0
    concept_items = db.query(Product).filter(Product.is_archived == False).filter(
        or_(Product.stock_type == "concept", Product.qty <= 0)
    ).count()

    # Revenue Recovery: sold items count
    revenue_recovery = db.query(SaleArchive).count()

    # Engagement: total ratings count
    engagement = db.query(Rating).count()

    # Asset zones
    products = db.query(Product).filter(Product.is_archived == False).all()
    zone_fresh = zone_watch = zone_dead = zone_reserved = 0
    for p in products:
        base_date = p.purchase_date or p.created_at.date()
        days_in_stock = (date.today() - base_date).days
        z = _status_zone(p, days_in_stock)
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
def recent_feedback(request: Request, db: Session = Depends(get_db), limit: int = 15):
    _ = get_current_admin(request)
    lim = max(1, min(int(limit), 100))
    rows = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(lim).all()
    return {"ok": True, "items": [{"id": r.id, "text": r.text, "kiosk_ref": r.kiosk_ref, "created_at": r.created_at.isoformat()} for r in rows]}


# -----------------------
# Customer Data CSV export
# -----------------------
@app.get("/customers/ratings.csv")
def export_ratings_csv(request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)

    rows = (
        db.query(Rating, Product)
        .join(Product, Product.sku == Rating.sku)
        .order_by(Rating.created_at.desc())
        .all()
    )

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["sku", "product_name", "stars", "customer_ref", "created_at"])
        yield buf.getvalue()
        buf.seek(0)
        buf.truncate(0)

        for r, p in rows:
            writer.writerow([r.sku, p.name, r.stars, r.customer_ref or "", r.created_at.isoformat()])
            yield buf.getvalue()
            buf.seek(0)
            buf.truncate(0)

    return StreamingResponse(generate(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=ratings.csv"})


# -----------------------
# Vault: Products CRUD + filters + drawer actions
# -----------------------
@app.get("/products", response_model=List[ProductOut])
def list_products(
    request: Request,
    db: Session = Depends(get_db),
    q: str = "",
    category: str = "",
    stock_type: str = "",
    weight_min: float = 0.0,
    weight_max: float = 0.0,
    include_archived: int = 0,
    limit: int = 200,
):
    _ = get_current_admin(request)

    lim = max(1, min(int(limit), 500))
    qry = db.query(Product)

    if not int(include_archived):
        qry = qry.filter(Product.is_archived == False)

    if q.strip():
        s = f"%{q.strip().lower()}%"
        qry = qry.filter(or_(func.lower(Product.sku).like(s), func.lower(Product.name).like(s), func.lower(Product.description).like(s)))

    if category.strip():
        qry = qry.filter(func.lower(Product.category) == category.strip().lower())

    if stock_type.strip():
        qry = qry.filter(Product.stock_type == stock_type.strip().lower())

    if weight_min > 0:
        qry = qry.filter(Product.weight_g != None).filter(Product.weight_g >= float(weight_min))
    if weight_max > 0:
        qry = qry.filter(Product.weight_g != None).filter(Product.weight_g <= float(weight_max))

    qry = qry.order_by(Product.updated_at.desc()).limit(lim)
    items = qry.all()
    return [_product_out(db, p) for p in items]


@app.get("/products/{sku}", response_model=ProductOut)
def get_product(sku: str, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return _product_out(db, p)


@app.post("/products", response_model=ProductOut)
def create_product(payload: ProductIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)

    exists = db.query(Product).filter(Product.sku == payload.sku).first()
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
    )
    p.options = payload.options

    db.add(p)
    db.commit() # Commit to get ID? schema uses SKU.

    # Handle Image Upload (Base64) - Upload to S3
    if payload.image_base64:
        try:
            # Expected format: "data:image/jpeg;base64,/9j/4AAQSkZQ..."
            header, encoded = payload.image_base64.split(",", 1)
            data = base64.b64decode(encoded)
            content_type = header.split(";", 1)[0].split(":", 1)[1]
            
            # Upload to S3 (returns s3_key, not URL)
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
                url=public_url  # Populate public URL
            )
            db.add(img)
            db.commit()
        except Exception as e:
            print(f"Error uploading image to S3: {e}")
            import traceback
            traceback.print_exc()
            with open("upload_debug_error.txt", "a") as f:
                f.write(f"Error: {e}\n")
                f.write(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
    
    return _product_out(db, p)


from fastapi import BackgroundTasks

def _bg_delete_s3_keys(keys: List[str]):
    for key in keys:
        try:
            delete_object_with_retry(key)
        except Exception as e:
            print(f"Background deletion failed for {key}: {e}")

@app.put("/products/{sku}", response_model=ProductOut)
def update_product(sku: str, payload: ProductIn, request: Request, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")

    # sku is primary key; do not allow changing it here
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

    # Handle Image Update - Upload to S3
    if payload.image_base64:
        try:
            # Queue old primary images for deletion
            old_primary = db.query(ProductImage).filter(ProductImage.sku == sku, ProductImage.is_primary == True).all()
            keys_to_delete = []
            for op in old_primary:
                op.is_primary = False
                if op.s3_key:
                    keys_to_delete.append(op.s3_key)
            
            if keys_to_delete:
                bg_tasks.add_task(_bg_delete_s3_keys, keys_to_delete)
            
            header, encoded = payload.image_base64.split(",", 1)
            data = base64.b64decode(encoded)
            content_type = header.split(";", 1)[0].split(":", 1)[1]
            
            # Upload to S3 (returns s3_key, not URL)
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
                url=public_url  # Populate public URL
            )
            db.add(img)
        except Exception as e:
            print(f"Error uploading image to S3: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    db.commit()
    return _product_out(db, p)


@app.delete("/products/{sku}")
def delete_product(sku: str, request: Request, bg_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        return {"ok": True}
    
    # Collect S3 keys for background deletion
    images = db.query(ProductImage).filter(ProductImage.sku == sku).all()
    keys_to_delete = [img.s3_key for img in images if img.s3_key]
    
    if keys_to_delete:
        bg_tasks.add_task(_bg_delete_s3_keys, keys_to_delete)

    db.delete(p)
    db.commit()
    return {"ok": True}


@app.post("/products/{sku}/reserve", response_model=ProductOut)
def reserve_product(sku: str, payload: ReserveIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    p.reserved_name = payload.name.strip()
    p.reserved_phone = payload.phone.strip()
    p.updated_at = datetime.utcnow()
    db.commit()
    return _product_out(db, p)


@app.post("/products/{sku}/release", response_model=ProductOut)
def release_reservation(sku: str, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    p.reserved_name = None
    p.reserved_phone = None
    p.updated_at = datetime.utcnow()
    db.commit()
    return _product_out(db, p)


@app.post("/products/{sku}/mark_sold")
def mark_sold(sku: str, payload: MarkSoldIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    p = db.query(Product).filter(Product.sku == sku).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")

    base_date = p.purchase_date or p.created_at.date()
    days_to_sell = (date.today() - base_date).days

    # archive
    p.is_archived = True
    p.updated_at = datetime.utcnow()

    # sales record
    existing = db.query(SaleArchive).filter(SaleArchive.sku == sku).first()
    if not existing:
        s = SaleArchive(
            sku=sku,
            sold_at=datetime.utcnow(),
            recovery_price_inr=payload.recovery_price_inr,
            days_to_sell=int(days_to_sell),
        )
        db.add(s)

    db.commit()
    return {"ok": True, "sku": sku, "days_to_sell": int(days_to_sell)}


# -----------------------
# Sales archive
# -----------------------
@app.get("/sales/archive")
def sales_archive(request: Request, db: Session = Depends(get_db), limit: int = 200):
    _ = get_current_admin(request)
    lim = max(1, min(int(limit), 500))
    rows = db.query(SaleArchive).order_by(SaleArchive.sold_at.desc()).limit(lim).all()
    return {
        "ok": True,
        "items": [
            {
                "id": r.id,
                "sku": r.sku,
                "sold_at": r.sold_at.isoformat(),
                "recovery_price_inr": r.recovery_price_inr,
                "days_to_sell": r.days_to_sell,
            }
            for r in rows
        ],
    }


# -----------------------
# Batch sourcing: image buffer + CSV import/match
# -----------------------
def _admin_buffer_dir(admin_email: str) -> Path:
    safe = admin_email.replace("@", "_at_").replace(".", "_")
    d = BUFFER_DIR / safe
    d.mkdir(parents=True, exist_ok=True)
    return d


@app.post("/uploads/buffer_images")
async def buffer_images(
    request: Request,
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db),
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

    # Parse global_date if provided
    gdate = None
    if global_date.strip():
        try:
            gdate = datetime.strptime(global_date.strip(), "%Y-%m-%d").date()
        except Exception:
            raise HTTPException(status_code=400, detail="global_date must be YYYY-MM-DD")

    # Expected columns (best-effort): sku, name, description, category, subcategory, weight_g, purchase_date, image_filename
    created = 0
    matched_images = 0

    for _, row in df.iterrows():
        sku = str(row.get("sku") or "").strip()
        name = str(row.get("name") or row.get("title") or "").strip()
        if not sku or not name:
            continue

        if db.query(Product).filter(Product.sku == sku).first():
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
        db.add(p)
        created += 1

        img_name = str(row.get("image_filename") or row.get("image") or row.get("filename") or "").strip()
        if img_name:
            candidate = buf_dir / Path(img_name).name
            if candidate.exists():
                # Move from buffer to media/products/<sku>/
                prod_dir = MEDIA_DIR / "products" / sku
                prod_dir.mkdir(parents=True, exist_ok=True)
                dest = prod_dir / candidate.name
                shutil.move(str(candidate), str(dest))
                rel_path = f"products/{sku}/{dest.name}"

                img = ProductImage(sku=sku, path=rel_path, is_primary=True)
                db.add(img)
                matched_images += 1

    db.commit()
    return {"ok": True, "created": created, "matched_images": matched_images}


# -----------------------
# Intelligence: Prescriptive cards + Wishlist
# -----------------------
@app.get("/intelligence/prescriptive")
def prescriptive(request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)

    # Sales velocity: sold in last 90 days by category
    cutoff = datetime.utcnow() - timedelta(days=90)

    # Join sold SKUs back to products is tricky after archive; we keep category snapshot by fetching from products table if still exists.
    # Here we approximate: count sold SKUs and compare to current stock counts per category.
    sold_recent = db.query(SaleArchive).filter(SaleArchive.sold_at >= cutoff).all()
    sold_skus = [s.sku for s in sold_recent]

    # current stock per category
    stock = db.query(Product).filter(Product.is_archived == False).all()
    stock_by_cat: Dict[str, int] = {}
    for p in stock:
        cat = (p.category or "Unknown").strip() or "Unknown"
        stock_by_cat[cat] = stock_by_cat.get(cat, 0) + 1

    # sold by cat (best effort)
    sold_by_cat: Dict[str, int] = {}
    for sku in sold_skus:
        p = db.query(Product).filter(Product.sku == sku).first()
        cat = (p.category if p else "Unknown") or "Unknown"
        cat = cat.strip() or "Unknown"
        sold_by_cat[cat] = sold_by_cat.get(cat, 0) + 1

    # ratings by cat
    rating_rows = (
        db.query(Product.category, func.avg(Rating.stars), func.count(Rating.id))
        .join(Rating, Rating.sku == Product.sku)
        .filter(Product.is_archived == False)
        .group_by(Product.category)
        .all()
    )
    ratings_by_cat: Dict[str, Tuple[float, int]] = {}
    for cat, avg, cnt in rating_rows:
        c = (cat or "Unknown").strip() or "Unknown"
        ratings_by_cat[c] = (float(avg or 0.0), int(cnt or 0))

    buy = []
    trial = []
    avoid = []

    for cat, stock_cnt in stock_by_cat.items():
        sold_cnt = sold_by_cat.get(cat, 0)
        avg_rating, votes = ratings_by_cat.get(cat, (0.0, 0))

        # BUY: sales velocity > stock count
        if sold_cnt > stock_cnt:
            buy.append(f"{cat} (sold90={sold_cnt}, stock={stock_cnt})")

        # TRIAL: high rating but low sold
        if avg_rating >= 4.0 and votes >= 3 and sold_cnt <= max(1, stock_cnt // 3):
            trial.append(f"{cat} (rating={avg_rating:.2f}, votes={votes})")

        # AVOID: deadstock heuristic (many items in Dead zone)
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
def create_wishlist(payload: WishlistIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
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
    db.add(w)
    db.commit()
    return {"ok": True, "id": w.id}


@app.get("/wishlist", response_model=List[WishlistOut])
def list_wishlist(request: Request, db: Session = Depends(get_db), limit: int = 200):
    _ = get_current_admin(request)
    lim = max(1, min(int(limit), 500))
    rows = db.query(WishlistRequest).order_by(WishlistRequest.created_at.desc()).limit(lim).all()

    # Potential matches: quick heuristic
    items: List[WishlistOut] = []
    for r in rows:
        q = db.query(Product).filter(Product.is_archived == False)
        if r.category:
            q = q.filter(func.lower(Product.category) == r.category.strip().lower())
        if r.weight_target_g is not None:
            q = q.filter(Product.weight_g != None).filter(Product.weight_g >= float(r.weight_target_g) * 0.8).filter(Product.weight_g <= float(r.weight_target_g) * 1.2)
        matches = q.count()

        items.append(
            WishlistOut(
                id=r.id,
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
@app.get("/customers", response_model=List[CustomerOut])
def list_customers(request: Request, db: Session = Depends(get_db), q: str = ""):
    _ = get_current_admin(request)
    qry = db.query(Customer).order_by(Customer.created_at.desc())
    if q.strip():
        s = f"%{q.strip().lower()}%"
        qry = qry.filter(or_(func.lower(Customer.name).like(s), Customer.phone.like(s)))
    return qry.limit(100).all()


@app.post("/customers", response_model=CustomerOut)
def create_customer(payload: CustomerIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    # Check phone unique
    existing = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=409, detail="Customer with this phone already exists")
    
    c = Customer(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email,
        notes=payload.notes,
        created_at=datetime.utcnow(),
    )
    db.add(c)
    db.commit()
    return c


@app.get("/orders", response_model=List[OrderOut])
def list_orders(request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    orders = db.query(Order).order_by(Order.created_at.desc()).limit(100).all()
    # Eager loading manually or via ORM if relationships set up correctly (they are)
    return orders


@app.post("/orders", response_model=OrderOut)
def create_order(payload: OrderIn, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    
    # Verify customer
    cust = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    total = 0.0
    # Create Order items
    items = []
    for it in payload.items:
        # Check product stock (optional, good practice)
        p = db.query(Product).filter(Product.sku == it.sku).first()
        if not p:
            raise HTTPException(status_code=400, detail=f"Product {it.sku} not found")
        
        # Calculate line total
        line_total = it.qty * it.price
        total += line_total
        
        items.append(OrderItem(
            sku=it.sku,
            qty=it.qty,
            price=it.price
        ))

    o = Order(
        customer_id=cust.id,
        total_amount=total,
        status=payload.status,
        created_at=datetime.utcnow()
    )
    db.add(o)
    db.commit() # Get order ID

    for item in items:
        item.order_id = o.id
        db.add(item)
    
    db.commit()
    
    # Reload to return full object
    db.refresh(o)
    return o


@app.put("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: str, status: str, request: Request, db: Session = Depends(get_db)):
    _ = get_current_admin(request)
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    
    o.status = status.upper()
    db.commit()
    db.refresh(o)
    return o
