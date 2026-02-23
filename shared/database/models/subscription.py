"""
Subscription System Models - Obuna tizimi
Admin-configurable plan turlari + Foydalanuvchi obunalari
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class SubscriptionStatus(str, enum.Enum):
    """Obuna holati"""
    active = "active"
    expired = "expired"
    cancelled = "cancelled"


class SubscriptionPlanConfig(Base):
    """
    Admin tomonidan sozlanadigan obuna planlari
    Narx, nom, imkoniyatlar — barchasi admin paneldan o'zgartiriladi
    """
    __tablename__ = "subscription_plan_configs"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Plan ma'lumotlari
    name = Column(String(100), nullable=False)           # "Asosiy", "Premium", "Maxsus"
    slug = Column(String(50), unique=True, nullable=False)  # "basic", "premium"
    description = Column(Text, nullable=True)            # Plan tavsifi

    # Narx va muddat
    price = Column(Integer, default=0)                   # UZS da narx (0 = bepul)
    duration_days = Column(Integer, default=30)          # Obuna muddati (kunlarda)

    # Imkoniyatlar
    max_children = Column(Integer, default=1)            # Nechta bola qo'shish mumkin
    features = Column(JSON, nullable=True)               # Imkoniyatlar ro'yxati
    # Masalan: {"darslar": true, "oyinlar": true, "olimpiada": false, "ai_test": false}

    # Holat va tartib
    is_active = Column(Boolean, default=True)            # Plan faolmi
    sort_order = Column(Integer, default=0)              # Ko'rsatish tartibi

    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan_config")

    def __repr__(self):
        return f"<SubscriptionPlanConfig {self.name} ({self.slug}) price={self.price}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "price": self.price,
            "duration_days": self.duration_days,
            "max_children": self.max_children,
            "features": self.features,
            "is_active": self.is_active,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserSubscription(Base):
    """
    Foydalanuvchi obuna tarixi
    Har bir obuna alohida yozuv — tarix saqlanadi
    """
    __tablename__ = "user_subscriptions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_config_id = Column(String(8), ForeignKey("subscription_plan_configs.id"), nullable=False)

    # Holat
    status = Column(String(20), default=SubscriptionStatus.active.value)

    # Vaqt
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # To'lov
    amount_paid = Column(Integer, default=0)  # UZS

    # Admin tomonidan kim berdi
    created_by = Column(String(50), nullable=True)  # admin role: "hazratqul", "nurali"
    notes = Column(Text, nullable=True)

    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="subscriptions")
    plan_config = relationship("SubscriptionPlanConfig", back_populates="subscriptions")

    def __repr__(self):
        return f"<UserSubscription user_id={self.user_id} status={self.status}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_config_id": self.plan_config_id,
            "plan": self.plan_config.to_dict() if self.plan_config else None,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "amount_paid": self.amount_paid,
            "created_by": self.created_by,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PromoCode(Base):
    """
    Promocode — admin yaratadi, foydalanuvchi kiritadi
    Turlari: discount (% chegirma), free_days (bepul kunlar), plan (plan berish)
    """
    __tablename__ = "promo_codes"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Promocode
    code = Column(String(50), unique=True, nullable=False, index=True)  # "ALIF2026", "START30"
    description = Column(Text, nullable=True)

    # Turi
    promo_type = Column(String(20), nullable=False, default="free_days")
    # "discount" — chegirma % (discount_percent dan foydalanadi)
    # "free_days" — bepul kunlar (free_days_count dan foydalanadi)
    # "plan" — to'liq plan berish (plan_config_id dan foydalanadi)

    # Discount parametrlari
    discount_percent = Column(Integer, default=0)       # 10, 20, 50, 100 (%)
    free_days_count = Column(Integer, default=0)         # Bepul kunlar soni
    plan_config_id = Column(String(8), ForeignKey("subscription_plan_configs.id"), nullable=True)

    # Cheklovlar
    max_uses = Column(Integer, default=0)               # 0 = cheksiz
    current_uses = Column(Integer, default=0)            # Necha marta ishlatildi
    max_uses_per_user = Column(Integer, default=1)       # Bir user necha marta ishlata oladi

    # Faollik muddati
    is_active = Column(Boolean, default=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)   # Boshlanish vaqti
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Tugash vaqti

    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    usages = relationship("PromoCodeUsage", back_populates="promo_code")
    plan_config = relationship("SubscriptionPlanConfig")

    def __repr__(self):
        return f"<PromoCode {self.code} type={self.promo_type}>"

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "description": self.description,
            "promo_type": self.promo_type,
            "discount_percent": self.discount_percent,
            "free_days_count": self.free_days_count,
            "plan_config_id": self.plan_config_id,
            "max_uses": self.max_uses,
            "current_uses": self.current_uses,
            "max_uses_per_user": self.max_uses_per_user,
            "is_active": self.is_active,
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PromoCodeUsage(Base):
    """Promocode ishlatish tarixi"""
    __tablename__ = "promo_code_usages"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    promo_code_id = Column(String(8), ForeignKey("promo_codes.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Natija
    result_type = Column(String(20), nullable=True)      # "discount", "free_days", "plan"
    result_value = Column(String(200), nullable=True)     # "30%", "14 kun", "Premium plan"

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    promo_code = relationship("PromoCode", back_populates="usages")
    user = relationship("User")

    def __repr__(self):
        return f"<PromoCodeUsage code={self.promo_code_id} user={self.user_id}>"


__all__ = [
    "SubscriptionStatus",
    "SubscriptionPlanConfig",
    "UserSubscription",
    "PromoCode",
    "PromoCodeUsage",
]

