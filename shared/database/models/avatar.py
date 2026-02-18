"""
Avatar Models - Avatarlar tizimi
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class Avatar(Base):
    """
    Avatar katalogi - Platformadagi barcha avatarlar
    """
    __tablename__ = "avatars"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    key = Column(String(50), unique=True, nullable=False)  # "lion", "rabbit", "robot"
    display_name = Column(String(100), nullable=False)
    display_name_uz = Column(String(100), nullable=False)
    display_name_ru = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Avatar {self.key}>"


class UserAvatar(Base):
    """
    Foydalanuvchi avatarini saqlash
    """
    __tablename__ = "user_avatars"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id"), nullable=False, unique=True)
    avatar_id = Column(String(8), ForeignKey("avatars.id"), nullable=True)
    custom_image_url = Column(String(500), nullable=True)  # Agar custom upload bo'lsa
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="avatar_selection")
    avatar = relationship("Avatar")
    
    def __repr__(self):
        return f"<UserAvatar user={self.user_id}>"


__all__ = ["Avatar", "UserAvatar"]
