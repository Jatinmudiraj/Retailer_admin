from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class AdminUser(BaseModel):
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


class GoogleCredentialIn(BaseModel):
    credential: str


class LoginIn(BaseModel):
    email: str
    password: str


class SignupIn(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class ProductIn(BaseModel):
    sku: str = Field(..., min_length=1, max_length=120)
    name: str = Field(..., min_length=1, max_length=240)
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    image_base64: Optional[str] = None  # New field for Base64 image upload
    weight_g: Optional[float] = None
    stock_type: str = "physical"
    qty: int = 1
    purchase_date: Optional[date] = None
    price: Optional[float] = None
    manual_rating: Optional[float] = None
    terms: Optional[str] = None
    options: Optional[dict] = None


class ProductOut(BaseModel):
    sku: str
    name: str
    description: Optional[str]
    category: Optional[str]
    subcategory: Optional[str]
    weight_g: Optional[float]
    stock_type: str
    price: Optional[float] = None
    manual_rating: Optional[float] = None
    terms: Optional[str] = None
    options: Optional[dict] = None
    qty: int
    purchase_date: Optional[date]
    reserved_name: Optional[str]
    reserved_phone: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    primary_image: Optional[str] = None
    bayesian_rating: Optional[float] = None
    rating_count: int = 0
    retail_valuation_inr: Optional[float] = None
    status_zone: Optional[str] = None  # Fresh/Watch/Dead/Reserved


class ReserveIn(BaseModel):
    name: str
    phone: str


class MarkSoldIn(BaseModel):
    recovery_price_inr: Optional[float] = None


class MetricOut(BaseModel):
    active_sourcing: int
    concept_items: int
    revenue_recovery: int
    engagement: int
    zone_fresh: int
    zone_watch: int
    zone_dead: int
    zone_reserved: int


class GoldRateOut(BaseModel):
    gold_rate_per_gram: float


class GoldRateIn(BaseModel):
    gold_rate_per_gram: float


class PrescriptiveCard(BaseModel):
    title: str
    color: str
    items: List[str]


class WishlistIn(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    request_text: str
    category: Optional[str] = None
    weight_target_g: Optional[float] = None
    budget_inr: Optional[float] = None


class WishlistOut(BaseModel):
    id: str
    client_name: Optional[str]
    client_phone: Optional[str]
    request_text: str
    category: Optional[str]
    weight_target_g: Optional[float]
    budget_inr: Optional[float]
    status: str
    created_at: datetime
    potential_matches: int


# S3 Image Upload Schemas
class PresignedUrlRequest(BaseModel):
    sku: str = Field(..., min_length=1, max_length=120)
    content_type: str = Field(..., pattern=r"^image/(jpeg|jpg|png|webp|gif)$")


class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
    expires_in: int
    bucket: str


class ImageFinalizeIn(BaseModel):
    sku: str
    s3_key: str
    is_primary: bool = True


class CustomerIn(BaseModel):
    name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=5)
    email: Optional[str] = None
    notes: Optional[str] = None


class CustomerOut(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str]
    notes: Optional[str]
    created_at: datetime


class OrderItemIn(BaseModel):
    sku: str
    qty: int
    price: float


class OrderItemOut(BaseModel):
    sku: str
    qty: int
    price: float


class OrderIn(BaseModel):
    customer_id: str
    items: List[OrderItemIn]
    status: str = "PENDING"


class OrderOut(BaseModel):
    id: str
    customer_id: str
    total_amount: float
    status: str
    created_at: datetime
    customer: Optional[CustomerOut] = None
    items: List[OrderItemOut] = []
