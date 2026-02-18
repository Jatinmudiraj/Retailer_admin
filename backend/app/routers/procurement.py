from fastapi import APIRouter, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.auth import get_current_admin
from app.models import Product, Order, ProductImage, SaleArchive

router = APIRouter()

class ProcurementRecommendation(BaseModel):
    sku: str
    name: str
    category: str
    current_stock: int
    forecasted_demand: int
    recommendation: str  # "Buy", "Do Not Buy", "Discount", "Urgent", "Dead Stock"
    recommendation_color: str # "green", "red", "yellow", "orange", "gray"
    reason: str
    days_in_stock: int
    sales_velocity_30d: float
    image_url: Optional[str] = None
    procurement_score: int # 0-100
    retail_value: float
    avg_rating: Optional[float] = 0.0
    rating_count: int = 0

@router.get("/recommendations", response_model=List[ProcurementRecommendation])
async def get_procurement_recommendations(
    user=Depends(get_current_admin)
):
    recommendations = []
    
    # 1. Fetch active products
    products = await Product.find(Product.is_archived == False).to_list()
    
    # Pre-fetch primary images
    # Optimization: Fetch all primary images in one go if possible, or simple loop for now (N queries, but fast in Mongo)
    # Better: Fetch all ProductImages where is_primary=True/ sku in [...]
    primary_images = await ProductImage.find(ProductImage.is_primary == True).to_list()
    image_map = {img.sku: img for img in primary_images}

    # 2. Sales Velocity (Next Level Intelligence)
    # Period A: Last 30 Days (T0 to T-30)
    # Period B: Previous 30 Days (T-30 to T-60)
    
    now = datetime.utcnow()
    t_30 = now - timedelta(days=30)
    t_60 = now - timedelta(days=60)
    
    # Fetch Period A Orders
    orders_a = await Order.find(Order.created_at >= t_30).to_list()
    sales_a = {}
    for o in orders_a:
        for i in o.items:
            sales_a[i.sku] = sales_a.get(i.sku, 0) + i.qty
            
    # Fetch Period B Orders (for trend)
    orders_b = await Order.find(Order.created_at >= t_60, Order.created_at < t_30).to_list()
    sales_b = {}
    for o in orders_b:
        for i in o.items:
            sales_b[i.sku] = sales_b.get(i.sku, 0) + i.qty

    # Fetch Archive Sales (Immediate Sales)
    archives_a = await SaleArchive.find(SaleArchive.sold_at >= t_30).to_list()
    for a in archives_a:
        sales_a[a.sku] = sales_a.get(a.sku, 0) + 1
        
    archives_b = await SaleArchive.find(SaleArchive.sold_at >= t_60, SaleArchive.sold_at < t_30).to_list()
    for a in archives_b:
        sales_b[a.sku] = sales_b.get(a.sku, 0) + 1
        
    # Fetch Ratings
    # This might be heavy if there are millions of ratings. 
    # For now, fetch all ratings is okay given the scale, or aggregate via pipeline in future.
    # Beanie doesn't support complex aggregation easily in `.find()`, let's just fetch all for now or optimize later.
    from app.models import Rating
    all_ratings = await Rating.find_all().to_list()
    rating_map = {} # SKU -> {total: 0, count: 0}
    for r in all_ratings:
        if r.sku not in rating_map: rating_map[r.sku] = {"total": 0, "count": 0}
        rating_map[r.sku]["total"] += r.stars
        rating_map[r.sku]["count"] += 1

    for p in products:
        sku = p.sku
        current_stock = p.qty
        vol_a = sales_a.get(sku, 0)
        vol_b = sales_b.get(sku, 0)
        
        # Rating Stats
        r_stats = rating_map.get(sku, {"total": 0, "count": 0})
        avg_rating = 0.0
        rating_count = r_stats["count"]
        if rating_count > 0:
            avg_rating = r_stats["total"] / rating_count
            
        # Interest Multiplier based on Rating
        # 4.5+ -> High Interest (Boost Forecast)
        # < 3.0 -> Low Interest (Dampen Forecast)
        interest_multiplier = 1.0
        
        if rating_count >= 3: # Only if significant data
            if avg_rating >= 4.5:
                interest_multiplier = 1.2 # Boost by 20%
            elif avg_rating < 3.0:
                interest_multiplier = 0.8 # Reduce by 20%
        
        # Trend Analysis
        # If Vol A > Vol B -> Positive Trend
        # If Vol A < Vol B -> Negative Trend
        trend_factor = 1.0
        if vol_b > 0:
            growth = (vol_a - vol_b) / vol_b
            trend_factor = 1.0 + (growth * 0.5) 
        elif vol_a > 0:
             trend_factor = 1.5
        
        trend_factor = max(0.5, min(2.0, trend_factor))

        # Stockout Adjustment
        stockout_multiplier = 1.0
        if current_stock == 0 and vol_a > 5:
             stockout_multiplier = 1.2
             
        # Forecast Calculation
        # Modifiers: Trend, Stockout, INTEREST
        raw_forecast = vol_a * trend_factor * stockout_multiplier * interest_multiplier
        
        if raw_forecast < 1 and vol_a > 0:
            raw_forecast = 1
            
        forecasted = int(round(raw_forecast))
            
        # Days In Stock
        base_date = p.purchase_date or p.created_at.date()
        if isinstance(base_date, datetime): base_date = base_date.date()
        days_in_stock = (now.date() - base_date).days
        
        # Default State
        rec_type = "Monitor"
        rec_color = "gray"
        reason = "Healthy stock level."
        score = 50 
        
        # Explain the forecast in reason
        trend_text = ""
        if trend_factor > 1.1: trend_text += " (Trending Up)"
        elif trend_factor < 0.9: trend_text += " (Cooling Down)"
        
        if interest_multiplier > 1.0: trend_text += f" [High Rated {avg_rating:.1f}★]"
        elif interest_multiplier < 1.0: trend_text += f" [Low Rated {avg_rating:.1f}★]"
        
        # Logic Tree
        if current_stock == 0 and forecasted > 0:
            rec_type = "Urgent Restock"
            rec_color = "red"
            reason = f"Stockout! Forecast {forecasted} units.{trend_text}"
            score = 100
            
        elif current_stock < forecasted:
            rec_type = "Buy"
            rec_color = "green"
            reason = f"Demand ({forecasted}) > Stock ({current_stock}).{trend_text}"
            score = 80 + min(20, int((forecasted - current_stock) * 2))

        elif current_stock > (forecasted * 3) and current_stock > 5:
            rec_type = "Overstocked"
            rec_color = "orange"
            reason = f"Inventory too high ({current_stock} vs {forecasted}).{trend_text}"
            score = 40
            
        elif vol_a == 0 and days_in_stock > 90:
            # Special Case: High Interest but No Sales?
            if avg_rating >= 4.0:
                 rec_type = "Promote"
                 rec_color = "blue"
                 reason = f"High interest ({avg_rating:.1f}★) but no sales. Pricing issue?{trend_text}"
                 score = 70
            else:
                rec_type = "Dead Stock"
                rec_color = "black"
                reason = f"No sales. Aged {days_in_stock} days.{trend_text}"
                score = 10 
            
        elif days_in_stock > 180 and vol_a < 2:
             rec_type = "Discount"
             rec_color = "yellow"
             reason = f"Aging stock. Consider clearance.{trend_text}"
             score = 60
        
        else:
             # Default Monitor
             if interest_multiplier > 1.0:
                 reason = f"Healthy stock. {trend_text}"
             elif interest_multiplier < 1.0:
                 reason = f"Healthy stock. {trend_text}"
             
        # Normalize Score
        score = max(0, min(100, score))

        # Image Logic
        img_url = None
        if sku in image_map:
            img = image_map[sku]
            if img.url: img_url = img.url
            elif img.s3_key: 
                 img_url = img.url 
        
        # Value
        val = 0.0
        if p.price:
            val = p.price * current_stock
        
        recommendations.append(ProcurementRecommendation(
            sku=sku,
            name=p.name,
            category=p.category or "Uncategorized",
            current_stock=current_stock,
            forecasted_demand=forecasted,
            recommendation=rec_type,
            recommendation_color=rec_color,
            reason=reason,
            days_in_stock=days_in_stock,
            sales_velocity_30d=float(vol_a),
            image_url=img_url,
            procurement_score=score,
            retail_value=val,
            avg_rating=round(avg_rating, 1),
            rating_count=rating_count
        ))
        
    recommendations.sort(key=lambda x: x.procurement_score, reverse=True)
    return recommendations

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/export")
async def export_procurement_plan(user=Depends(get_current_admin)):
    # 1. Get Data
    recs = await get_procurement_recommendations(user)
    
    # 2. Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "SKU", "Name", "Category", "Stock", "Forecast (30d)", 
        "Velocity (30d)", "Days In Stock", "Rating", "Score", 
        "Recommendation", "Reason", "Value (INR)"
    ])
    
    # Rows
    for r in recs:
        writer.writerow([
            r.sku,
            r.name,
            r.category,
            r.current_stock,
            r.forecasted_demand,
            r.sales_velocity_30d,
            r.days_in_stock,
            f"{r.avg_rating} ({r.rating_count})",
            r.procurement_score,
            r.recommendation,
            r.reason,
            r.retail_value
        ])
        
    output.seek(0)
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=procurement_plan.csv"
    return response
