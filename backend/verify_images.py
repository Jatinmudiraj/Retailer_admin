from app.db import SessionLocal
from app.models import Product, ProductImage

db = SessionLocal()
sku = "SKU-200496"
p = db.query(Product).filter(Product.sku == sku).first()
if p:
    print(f"Product found: {p.sku}")
    print(f"Images count: {len(p.images)}")
    for img in p.images:
        print(f" - Image: {img.s3_key} (URL: {img.url})")
else:
    print("Product not found")
