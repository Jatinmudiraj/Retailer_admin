import asyncio
import os
import sys

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.append(backend_dir)

from app.db import init_db
from app.models import Product
from app.recommender import recommender as adv_rec

async def test_advanced_recommender():
    print("Initializing DB...")
    await init_db()
    
    print("Fetching products...")
    products = await Product.find(Product.is_archived == False).to_list()
    if not products:
        print("No products found.")
        return

    print(f"Training AdvancedRecommender on {len(products)} products...")
    adv_rec.fit(products)
    
    # Pick a random SKU
    sku = products[0].sku
    print(f"\n--- Testing Similar Products for {sku} ({products[0].name}) ---")
    print(f"Base Attributes: {products[0].category}, {products[0].tags}, Price: {products[0].price}")
    
    sims = adv_rec.get_similar_products(sku, top_n=3)
    for s in sims:
        print(f" -> {s.sku}: {s.name} (Price: {s.price})")
        
    print("\n--- Testing Personalized (Cold Start) ---")
    sims_user = await adv_rec.recommend_for_user("non_existent_user")
    for s in sims_user:
        print(f" -> {s.sku}: {s.name}")

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(test_advanced_recommender())
    except Exception as e:
        print(f"Error: {e}")
