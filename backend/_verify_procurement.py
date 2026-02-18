import asyncio
from app.db import init_db
from app.routers.procurement import get_procurement_recommendations
from app.models import Product, Order
from datetime import datetime

async def main():
    await init_db()
    print("Database initialized.")
    
    with open("verification_result.txt", "w") as f:
        try:
            recommendations = await get_procurement_recommendations()
            f.write(f"Generated {len(recommendations)} recommendations.\n")
            
            for rec in recommendations[:5]:
                f.write(f"SKU: {rec.sku}, Name: {rec.name}\n")
                f.write(f"  Stock: {rec.current_stock}, Demand: {rec.forecasted_demand}\n")
                f.write(f"  Rec: {rec.recommendation} ({rec.recommendation_color})\n")
                f.write(f"  Reason: {rec.reason}\n")
                f.write("-" * 30 + "\n")
                
        except Exception as e:
            f.write(f"Error: {e}\n")
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(main())
