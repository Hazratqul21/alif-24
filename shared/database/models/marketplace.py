import enum
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Integer, Float, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class MarketplaceItemType(str, enum.Enum):
    lesson = "lesson"
    test = "test"
    ertak = "ertak"
    material = "material"
    bundle = "bundle"
    live_quiz = "live_quiz"

class MarketplaceStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"

class MarketplaceItem(Base):
    """
    Marketplace Item - Listing for a resource
    """
    __tablename__ = "marketplace_items"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    seller_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Resource Linking
    resource_id = Column(String(8), nullable=False) # ID of the Lesson, Test, etc.
    resource_type = Column(SQLEnum(MarketplaceItemType), nullable=False)
    
    # Details
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True)
    grade_level = Column(String(50), nullable=True)
    language = Column(String(10), default="uz")
    
    # Media
    thumbnail_url = Column(String(500), nullable=True)
    preview_urls = Column(JSON, nullable=True) # List of image/video URLs for preview
    
    # Pricing
    price = Column(Integer, nullable=False, default=0) # In UZS
    is_free = Column(Boolean, default=False)
    
    # Stats
    average_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    sales_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    
    status = Column(SQLEnum(MarketplaceStatus), default=MarketplaceStatus.published)
    is_featured = Column(Boolean, default=False)
    
    # Metadata
    tags = Column(JSON, nullable=True) # ["math", "geometry", "interactive"]
    raw_content_preview = Column(Text, nullable=True) # Text snippet or redacted JSON for read-only preview
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    seller = relationship("User", foreign_keys=[seller_id])
    reviews = relationship("MarketplaceReview", back_populates="item", cascade="all, delete-orphan")
    purchases = relationship("MarketplacePurchase", back_populates="item")

    def __repr__(self):
        return f"<MarketplaceItem {self.title} @{self.price} UZS>"


class MarketplaceReview(Base):
    """
    User reviews for marketplace items
    """
    __tablename__ = "marketplace_reviews"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    item_id = Column(String(8), ForeignKey("marketplace_items.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    rating = Column(Integer, nullable=False) # 1-5
    comment = Column(Text, nullable=True)
    
    is_verified_buyer = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    item = relationship("MarketplaceItem", back_populates="reviews")
    user = relationship("User")


class MarketplacePurchase(Base):
    """
    Ownership / Purchase record
    """
    __tablename__ = "marketplace_purchases"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String(8), ForeignKey("marketplace_items.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # The cloned resource
    cloned_resource_id = Column(String(8), nullable=False)
    resource_type = Column(SQLEnum(MarketplaceItemType), nullable=False)
    
    # Financials at time of purchase
    purchase_price = Column(Integer, nullable=False)
    commission_paid = Column(Integer, nullable=False) # The 10% cut
    
    transaction_id = Column(String(8), ForeignKey("payment_transactions.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    item = relationship("MarketplaceItem", back_populates="purchases")
