"""
Organization & Moderator Models - Tashkilot va Moderator profillari
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id
from shared.database.models.user import ModeratorRoleType


class OrganizationProfile(Base):
    """
    Tashkilot/Maktab profili
    """
    __tablename__ = "organization_profiles"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Tashkilot ma'lumotlari
    name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=True)
    district = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(200), nullable=True)
    license_number = Column(String(50), nullable=True)
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="organization_profile", foreign_keys=[user_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "district": self.district
        }
    
    def __repr__(self):
        return f"<OrganizationProfile name={self.name}>"


class ModeratorProfile(Base):
    """
    Moderator profili (CEO, CTO, Metodist)
    """
    __tablename__ = "moderator_profiles"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    role_type = Column(SQLEnum(ModeratorRoleType), nullable=False)
    permissions = Column(JSON, nullable=True)  # Kelajakda batafsil ruxsatlar uchun
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="moderator_profile", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<ModeratorProfile user={self.user_id} type={self.role_type.value}>"


__all__ = ["OrganizationProfile", "ModeratorProfile"]
