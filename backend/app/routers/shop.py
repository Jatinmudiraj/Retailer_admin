from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.models import Product, Rating

router = APIRouter()

class RatingRequest(BaseModel):
    stars: int # 1-5
    customer_ref: Optional[str] = None # Optional for anonymous/guest ratings

class RatingResponse(BaseModel):
    sku: str
    average_rating: float
    total_ratings: int

@router.post("/products/{sku}/rate")
async def rate_product(sku: str, rating: RatingRequest):
    # Verify product exists
    product = await Product.find_one(Product.sku == sku)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if rating.stars < 1 or rating.stars > 5:
        raise HTTPException(status_code=400, detail="Stars must be 1-5")

    # Save Rating
    new_rating = Rating(
        sku=sku,
        stars=rating.stars,
        customer_ref=rating.customer_ref
    )
    await new_rating.create()
    
    return {"message": "Rating submitted successfully"}

@router.get("/products/{sku}/ratings", response_model=RatingResponse)
async def get_product_ratings(sku: str):
    # Aggregation
    ratings = await Rating.find(Rating.sku == sku).to_list()
    
    if not ratings:
        return RatingResponse(sku=sku, average_rating=0.0, total_ratings=0)
        
    avg = sum(r.stars for r in ratings) / len(ratings)
    
    return RatingResponse(
        sku=sku,
        average_rating=round(avg, 1),
        total_ratings=len(ratings)
    )
