import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.append(backend_dir)

from app.db import init_db
from app.models import Product, ProductImage
from mimetypes import guess_type

async def cleanup():
    print("Initializing DB...")
    await init_db()
    
    # Delete products created in the last 15 minutes (since I started working on this task)
    cutoff = datetime.utcnow() - timedelta(minutes=15)
    
    print(f"Deleting products created after {cutoff}...")
    
    # Find products to delete
    products = await Product.find(Product.created_at > cutoff).to_list()
    count = len(products)
    print(f"Found {count} products to delete.")
    
    if count > 0:
        skus = [p.sku for p in products]
        
        # Delete Products
        await Product.find(Product.created_at > cutoff).delete()
        
        # Delete Images associated with these SKUs
        # Start searching for images
        # Since ProductImage doesn't have created_at filter easily accessible without fetching, 
        # we filter by SKU
        
        # Batch delete images by SKU
        # This might be slow if many, but for a few it's fine.
        # ProductImage.find(ProductImage.sku.in_(skus)).delete()
        
        # Beanie's `in_` operator
        from beanie.operators import In
        await ProductImage.find(In(ProductImage.sku, skus)).delete()
        
        print("Deleted products and images.")
    else:
        print("No recent products found.")

if __name__ == "__main__":
    asyncio.run(cleanup())
