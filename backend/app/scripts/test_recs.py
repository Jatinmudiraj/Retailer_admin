import asyncio
import os
import sys

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.append(backend_dir)

from app.db import init_db
from app.models import Product
from app.recommender import recommender

async def test_recommender():
    await init_db()
    
    products = await Product.find(Product.is_archived == False).to_list()
    if not products:
        print("No products found.")
        return

    print(f"Training on {len(products)} products...")
    recommender.fit(products)
    
    # Pick a random SKU
    sku = products[0].sku
    print(f"Testing recommendations for {sku} ({products[0].name})...")
    
    sims = recommender.get_similar_products(sku, top_n=3)
    print("Similar Items:")
    for s in sims:
        print(f" - {s.sku}: {s.name}")
        
    print("\nTesting personalized (cold start)...")
    sims_user = await recommender.recommend_for_user("non_existent_user")
    print("User Recs:")
    for s in sims_user:
        print(f" - {s.sku}: {s.name}")

if __name__ == "__main__":
    asyncio.run(test_recommender())
