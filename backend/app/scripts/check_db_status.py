import asyncio
import os
import sys

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.append(backend_dir)

from app.db import init_db
from app.models import Product, ProductImage

async def check():
    await init_db()
    
    p_count = await Product.count()
    i_count = await ProductImage.count()
    
    print(f"Products: {p_count}")
    print(f"Images: {i_count}")
    
    # Check sample product for full details
    if p_count > 0:
        p = await Product.find_one()
        print(f"Sample Product: {p.sku}")
        print(f"  Name: {p.name}")
        print(f"  Price: {p.price}")
        print(f"  Weight: {p.weight_g}g")
        print(f"  Category: {p.category}")
        print(f"  Tags: {p.tags}")
        
    # Check sample images for this product
    if p_count > 0:
        imgs = await ProductImage.find(ProductImage.sku == p.sku).to_list()
        print(f"  Images Count for {p.sku}: {len(imgs)}")
        for img in imgs:
             print(f"    - {img.s3_key} (Primary: {img.is_primary})")

if __name__ == "__main__":
    asyncio.run(check())
