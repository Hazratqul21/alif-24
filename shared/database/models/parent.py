"""
Parent Profile Model - Ota-ona profili
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class ParentProfile(Base):
    """
    Ota-ona profili
    Bolalar akkauntlarini boshqaradi va obunalarni to'laydi
    """
    __tablename__ = "parent_profiles"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Shaxsiy ma'lumotlar
    occupation = Column(String(200), nullable=True)
    
    # Obuna
    subscription_plan = Column(String(50), default="free")  # free, basic, premium
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    max_children_allowed = Column(Integer, default=3)
    
    # Bildirishnoma sozlamalari
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    weekly_report = Column(Boolean, default=True)
    achievement_alerts = Column(Boolean, default=True)
    notification_preferences = Column(JSON, nullable=True)
    
    # Ota-ona nazorati (barcha bolalar uchun)
    default_screen_time = Column(Integer, default=60)  # daqiqalar
    content_filter_level = Column(String(20), default="strict")  # strict, moderate, off
    allowed_time_slots = Column(JSON, nullable=True)
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="parent_profile", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<ParentProfile user_id={self.user_id} plan={self.subscription_plan}>"


__all__ = ["ParentProfile"]
