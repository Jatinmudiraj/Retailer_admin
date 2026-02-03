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


class CustomerSignupIn(BaseModel):
    phone: str
    password: str
    name: str
    email: Optional[str] = None


class CustomerLoginIn(BaseModel):
    phone: str
    password: str


class CustomerGoogleAuthIn(BaseModel):
    credential: str


class CustomerGoogleAuthOut(BaseModel):
    ok: bool
    status: str  # "success" or "need_phone"
    user: Optional[dict] = None  # if success
    google_profile: Optional[dict] = None  # if need_phone


class PaymentOrderIn(BaseModel):
    amount: float
    currency: str = "INR"

class PaymentVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    total_amount: float = 0.0


class ProductIn(BaseModel):
    sku: str = Field(..., min_length=1, max_length=120)
    name: str = Field(..., min_length=1, max_length=240)
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    image_base64: Optional[str] = None  # New field for Base64 image upload
    additional_images: Optional[List[str]] = []
    weight_g: Optional[float] = None
    stock_type: str = "physical"
    qty: int = 1
    purchase_date: Optional[date] = None
    price: Optional[float] = None
    manual_rating: Optional[float] = None
    terms: Optional[str] = None
    terms: Optional[str] = None
    options: Optional[dict] = None
    tags: Optional[List[str]] = []


class ProductImageOut(BaseModel):
    s3_key: str
    url: Optional[str] = None
    is_primary: bool = False


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
    terms: Optional[str] = None
    options: Optional[dict] = None
    tags: Optional[List[str]] = []
    qty: int
    purchase_date: Optional[date]
    reserved_name: Optional[str]
    reserved_phone: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    primary_image: Optional[str] = None
    images: List[ProductImageOut] = []  # Added images list
    bayesian_rating: Optional[float] = None
    rating_count: int = 0
    retail_valuation_inr: Optional[float] = None
    status_zone: Optional[str] = None  # Fresh/Watch/Dead/Reserved
    status_zone: Optional[str] = None  # Fresh/Watch/Dead/Reserved
    reservations: List[ReservationOut] = []  # Added reservations list
    related_products: List[str] = []  # List of SKUs


class ReservationOut(BaseModel):
    id: str
    name: str
    phone: Optional[str]
    qty: int
    created_at: datetime


class ReserveIn(BaseModel):
    name: str
    phone: str
    qty: int = 1


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


class PublicOrderIn(BaseModel):
    # Combined Customer + Order info for checkout
    customer_name: str
    customer_phone: str
    items: List[OrderItemIn]


class OrderOut(BaseModel):
    id: str
    customer_id: str
    total_amount: float
    status: str
    created_at: datetime
    customer: Optional[CustomerOut] = None
    items: List[OrderItemOut] = []
