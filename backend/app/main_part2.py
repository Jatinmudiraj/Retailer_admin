
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
        
        if recommender.model is not None:
            related_skus = recommender.get_recommendations(sku)
            out.related_products = related_skus
        
        return out
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
