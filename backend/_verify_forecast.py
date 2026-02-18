import asyncio
from app.db import init_db
from app.routers.procurement import get_procurement_recommendations
from app.models import Product, Order
from datetime import datetime

async def main():
    await init_db()
    
    with open("verification_forecast.txt", "w") as f:
        try:
            recommendations = await get_procurement_recommendations()
            f.write(f"Generated {len(recommendations)} recommendations.\n")
            
            # Show items with interesting forecasts (forecast > 1 or trend text)
            interesting = [r for r in recommendations if "Trend" in r.reason or r.forecasted_demand > 1]
            
            if not interesting:
                f.write("No interesting trends found in dummy data. Showing first 5:\n")
                interesting = recommendations[:5]
                
            for rec in interesting[:10]:
                f.write(f"SKU: {rec.sku} | Name: {rec.name}\n")
                f.write(f"  Stock: {rec.current_stock}\n")
                f.write(f"  Sales 30d: {rec.sales_velocity_30d}\n")
                f.write(f"  Forecast: {rec.forecasted_demand}\n")
                f.write(f"  Reason: {rec.reason}\n")
                f.write("-" * 30 + "\n")
                
        except Exception as e:
            f.write(f"Error: {e}\n")
            import traceback
            traceback.print_exc(file=f)

if __name__ == "__main__":
    asyncio.run(main())
