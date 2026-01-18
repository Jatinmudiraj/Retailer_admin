import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.models import Product, ProductImage

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not set")
    sys.exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def debug_product_and_delete(sku_to_check):
    print(f"\n--- Checking Product: {sku_to_check} ---")
    p = db.query(Product).filter(Product.sku == sku_to_check).first()
    
    if not p:
        print("Product NOT FOUND.")
        # List random 5 to help user pick one
        print("Here are 5 random SKUs in DB:")
        res = db.execute(text("SELECT sku FROM products LIMIT 5"))
        for r in res:
            print(f"- {r[0]}")
        return

    print(f"Name: {p.name}")
    print(f"Stock Type: {p.stock_type}")
    
    print("\n[Images]")
    imgs = db.query(ProductImage).filter(ProductImage.sku == sku_to_check).all()
    for i, img in enumerate(imgs):
        print(f"#{i+1}: ID={img.id}, IsPrimary={img.is_primary}")
        print(f"    S3_Key: {img.s3_key}")
        print(f"    URL_Col: {img.url}")
        print(f"    Status: {img.upload_status}")

    # Now attempt simulated delete (rollback after)
    print("\n[Simulation] Attempting Delete...")
    try:
        db.delete(p)
        db.flush() # Check for constraints
        print("SUCCESS: Product deletion logic worked (Rolled back for safety).")
        db.rollback()
    except Exception as e:
        print(f"FAILED: Deletion raised exception: {e}")
        db.rollback()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_sku = sys.argv[1]
    else:
        # Pick one automatically
        res = db.execute(text("SELECT sku FROM products LIMIT 1"))
        row = res.fetchone()
        target_sku = row[0] if row else "NO_PRODUCTS"

    debug_product_and_delete(target_sku)
