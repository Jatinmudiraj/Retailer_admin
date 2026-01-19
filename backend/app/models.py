from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    JSON,
    LargeBinary,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[str] = mapped_column(String(500), nullable=False)


class Product(Base):
    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(120), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    subcategory: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    weight_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # stock_type: "physical" or "concept"
    stock_type: Mapped[str] = mapped_column(String(20), nullable=False, default="physical")
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # reservation
    reserved_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    reserved_phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    manual_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    sku: Mapped[str] = mapped_column(String(120), ForeignKey("products.sku"), nullable=False)
    
    # Legacy fields (for backward compatibility)
    path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Old full URL
    
    # New S3 fields (production-ready)
    s3_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # Immutable S3 object key
    upload_status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")  # PENDING|ACTIVE|FAILED
    
    # Metadata
    content_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # bytes
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # SHA256
    
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="images")


class S3DeletionQueue(Base):
    """Queue for safe async deletion of S3 objects."""
    __tablename__ = "s3_deletion_queue"
    
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    key: Mapped[str] = mapped_column(String(500), nullable=False)
    
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    next_retry_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    __table_args__ = (
        UniqueConstraint("bucket", "key", name="uniq_deletion_bucket_key"),
    )

class Rating(Base):
    __tablename__ = "ratings"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    sku: Mapped[str] = mapped_column(String(120), ForeignKey("products.sku"), nullable=False)
    stars: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..5
    customer_ref: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    product = relationship("Product", back_populates="ratings")


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    kiosk_ref: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class WishlistRequest(Base):
    __tablename__ = "wishlist_requests"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    client_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    client_phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    request_text: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    weight_target_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    budget_inr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")  # open/fulfilled/closed
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class SaleArchive(Base):
    __tablename__ = "sales_archive"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    sku: Mapped[str] = mapped_column(String(120), nullable=False)
    sold_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    recovery_price_inr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    days_to_sell: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("sku", name="uniq_sale_sku"),)


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("phone", name="uniq_customer_phone"),)
    orders = relationship("Order", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    customer_id: Mapped[str] = mapped_column(String(40), ForeignKey("customers.id"), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")  # PENDING, COMPLETED, CANCELLED
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=_uuid)
    order_id: Mapped[str] = mapped_column(String(40), ForeignKey("orders.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(120), ForeignKey("products.sku"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="items")


class AdminAccount(Base):
    __tablename__ = "admin_accounts"
    email: Mapped[str] = mapped_column(String(120), primary_key=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    picture: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
