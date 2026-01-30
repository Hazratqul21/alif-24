"""
Guest Session Model - mehmon sessiyalarini kuzatish
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class GuestSession(Base):
    """Mehmon sessiyalari - birinchi content bepul, keyingi uchun login talab"""
    __tablename__ = "guest_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    fingerprint = Column(String(255), nullable=True)  # Browser fingerprint
    ip_address = Column(String(50), nullable=True)
    
    # Content usage tracking
    content_accessed_count = Column(Integer, default=0)  # Nechta content ishlatgan
    first_content_type = Column(String(50), nullable=True)  # 'harf', 'rharf', 'math', etc.
    first_content_id = Column(String(100), nullable=True)  # Content identifier
    
    # Session info
    is_active = Column(Boolean, default=True)
    requires_login = Column(Boolean, default=False)  # 2+ content uchun true
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    converted_to_user_id = Column(UUID(as_uuid=True), nullable=True)  # Agar ro'yxatdan o'tsa
    converted_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<GuestSession {self.session_token[:8]}... accessed={self.content_accessed_count}>"
