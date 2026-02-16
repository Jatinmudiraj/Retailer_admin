from __future__ import annotations

from typing import Optional, List, Dict
from datetime import datetime, date
import uuid

from beanie import Document, Indexed
from pydantic import Field, BaseModel

def _uuid() -> str:
    return uuid.uuid4().hex

class Setting(Document):
    key: Indexed(str, unique=True)
    value: str

    class Settings:
        name = "settings"

class ProductImage(Document):
    # Independent document to allow fetching by ID easily
    id: str = Field(default_factory=_uuid)
    sku: Indexed(str) # Reference to Product SKU
    
    # Legacy fields
    path: Optional[str] = None
    image_data: Optional[bytes] = None
    url: Optional[str] = None
    
    # New S3 fields
    s3_key: Optional[str] = None
    upload_status: str = "ACTIVE"
    
    content_type: Optional[str] = None
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    
    is_primary: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "product_images"

class Reservation(Document):
    id: str = Field(default_factory=_uuid)
    sku: Indexed(str)
    name: str
    phone: Optional[str] = None
    qty: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "reservations"

class Rating(Document):
    id: str = Field(default_factory=_uuid)
    sku: Indexed(str)
    stars: int # 1..5
    customer_ref: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ratings"

class Product(Document):
    sku: Indexed(str, unique=True)
    name: str
    description: Optional[str] = None

    category: Optional[str] = None
    subcategory: Optional[str] = None

    weight_g: Optional[float] = None

    stock_type: str = "physical"
    qty: int = 1

    purchase_date: Optional[date] = None

    # reservation (legacy)
    reserved_name: Optional[str] = None
    reserved_phone: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    is_archived: bool = False

    price: Optional[float] = None
    manual_rating: Optional[float] = None
    terms: Optional[str] = None
    options: Optional[Dict] = None
    tags: Optional[List[str]] = None

    class Settings:
        name = "products"

class S3DeletionQueue(Document):
    bucket: str
    key: Indexed(str, unique=True)
    
    attempts: int = 0
    max_attempts: int = 5
    next_retry_at: datetime = Field(default_factory=datetime.utcnow)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_error: Optional[str] = None

    class Settings:
        name = "s3_deletion_queue"

class Feedback(Document):
    text: str
    kiosk_ref: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "feedback"

class WishlistRequest(Document):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    request_text: str
    category: Optional[str] = None
    weight_target_g: Optional[float] = None
    budget_inr: Optional[float] = None
    status: str = "open"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "wishlist_requests"

class SaleArchive(Document):
    sku: Indexed(str, unique=True)
    sold_at: datetime = Field(default_factory=datetime.utcnow)
    recovery_price_inr: Optional[float] = None
    days_to_sell: Optional[int] = None

    class Settings:
        name = "sales_archive"

class Customer(Document):
    name: str
    phone: Indexed(str, unique=True)
    email: Optional[str] = None
    hashed_password: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "customers"

class OrderItem(BaseModel):
    # Embedded in Order is better for consistency
    id: str = Field(default_factory=_uuid)
    sku: str
    qty: int = 1
    price: float = 0.0

class Order(Document):
    customer_id: Indexed(str)
    total_amount: float = 0.0
    status: str = "PENDING"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    items: List[OrderItem] = []

    class Settings:
        name = "orders"

class AdminAccount(Document):
    email: Indexed(str, unique=True)
    hashed_password: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "admin_accounts"
