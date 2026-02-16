from __future__ import annotations

import motor.motor_asyncio
from beanie import init_beanie

from app.config import get_settings
from app.models import (
    Setting, Product, ProductImage, Rating, Reservation,
    S3DeletionQueue, Feedback, WishlistRequest, SaleArchive, 
    Customer, Order, AdminAccount
)

settings = get_settings()

async def init_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.DATABASE_URL)
    
    # Use default database from connection string or 'retailer_admin'
    db = client.get_default_database("retailer_admin")
    
    await init_beanie(
        database=db,
        document_models=[
            Setting,
            Product,
            ProductImage,
            Rating,
            Reservation,
            S3DeletionQueue,
            Feedback,
            WishlistRequest,
            SaleArchive,
            Customer,
            Order,
            AdminAccount
        ]
    )
