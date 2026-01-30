from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Avatar(Base):
    __tablename__ = "avatars"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    display_name_uz = Column(String(100), nullable=False)
    display_name_ru = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - Profile nomli mappable class topilmaganligi sababli o'chirildi
    # profiles = relationship("User", back_populates="avatar_relation")

