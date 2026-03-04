"""
Payment System Models — To'lov tizimi
PaymentGatewayConfig: Admin tomonidan sozlanadigan to'lov gateway'lari
PaymentTransaction: Har bir to'lov tranzaksiyasi
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class PaymentProvider(str, enum.Enum):
    """To'lov provayderlari"""
    payme = "payme"
    click = "click"
    uzum = "uzum"


class TransactionStatus(str, enum.Enum):
    """Tranzaksiya holati"""
    pending = "pending"         # Kutilmoqda
    processing = "processing"   # Jarayonda
    completed = "completed"     # Muvaffaqiyatli
    failed = "failed"           # Muvaffaqiyatsiz
    cancelled = "cancelled"     # Bekor qilingan
    refunded = "refunded"       # Qaytarilgan


class PaymentGatewayConfig(Base):
    """
    Admin tomonidan sozlanadigan to'lov gateway konfiguratsiyasi.
    Admin paneldan gateway qo'shish, o'chirish, kalitlarni o'zgartirish mumkin.
    """
    __tablename__ = "payment_gateway_configs"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Gateway ma'lumotlari
    provider = Column(String(20), nullable=False)         # "payme", "click", "uzum"
    name = Column(String(100), nullable=False)             # "Payme", "Click", "Uzum Bank"
    description = Column(Text, nullable=True)

    # API kalitlari (shifrlangan saqlash tavsiya etiladi)
    merchant_id = Column(String(200), nullable=True)
    secret_key = Column(String(500), nullable=True)
    service_id = Column(String(200), nullable=True)        # Click uchun

    # Konfiguratsiya
    is_active = Column(Boolean, default=True)              # Faolmi
    is_test_mode = Column(Boolean, default=True)           # Test rejimi
    is_default = Column(Boolean, default=False)            # Birlamchi gateway

    # Webhook URL (tizim tomonidan avtomatik to'ldiriladi)
    webhook_url = Column(String(500), nullable=True)

    # Qo'shimcha sozlamalar
    settings = Column(JSON, nullable=True)
    # Masalan: {"min_amount": 1000, "max_amount": 50000000, "currency": "UZS"}

    # Tartib
    sort_order = Column(Integer, default=0)

    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    transactions = relationship("PaymentTransaction", back_populates="gateway_config")

    def __repr__(self):
        return f"<PaymentGatewayConfig {self.provider} active={self.is_active}>"

    def to_dict(self, hide_keys=True):
        result = {
            "id": self.id,
            "provider": self.provider,
            "name": self.name,
            "description": self.description,
            "is_active": self.is_active,
            "is_test_mode": self.is_test_mode,
            "is_default": self.is_default,
            "webhook_url": self.webhook_url,
            "settings": self.settings,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if not hide_keys:
            result["merchant_id"] = self.merchant_id
            result["secret_key"] = self.secret_key
            result["service_id"] = self.service_id
        else:
            # Maskirovka: faqat oxirgi 4 belgi
            result["merchant_id"] = f"***{self.merchant_id[-4:]}" if self.merchant_id else None
            result["secret_key"] = f"***{self.secret_key[-4:]}" if self.secret_key else None
            result["service_id"] = f"***{self.service_id[-4:]}" if self.service_id else None
        return result


class PaymentTransaction(Base):
    """
    To'lov tranzaksiyasi — har bir to'lov yozuvi.
    Checkout'dan yaratiladi, webhook orqali yangilanadi.
    """
    __tablename__ = "payment_transactions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Foydalanuvchi
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Plan (nimaga to'layapti)
    plan_config_id = Column(String(8), ForeignKey("subscription_plan_configs.id"), nullable=True)

    # Gateway
    gateway_config_id = Column(String(8), ForeignKey("payment_gateway_configs.id"), nullable=True)
    provider = Column(String(20), nullable=False)          # "payme", "click", "uzum"

    # Tranzaksiya ma'lumotlari
    amount = Column(Integer, nullable=False)                # UZS (tiyin emas, so'm)
    status = Column(String(20), default=TransactionStatus.pending.value, index=True)

    # Tashqi tranzaksiya ID
    external_id = Column(String(200), nullable=True, index=True)  # Gateway'dan kelgan ID
    checkout_url = Column(String(1000), nullable=True)     # To'lov sahifasi URL

    # Gateway javobi
    gateway_response = Column(JSON, nullable=True)         # Oxirgi gateway javob
    error_message = Column(Text, nullable=True)

    # Tavsif
    description = Column(String(500), nullable=True)       # "Premium plan obunasi"

    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="payment_transactions")
    plan_config = relationship("SubscriptionPlanConfig")
    gateway_config = relationship("PaymentGatewayConfig", back_populates="transactions")

    def __repr__(self):
        return f"<PaymentTransaction {self.id} {self.provider} {self.status} {self.amount}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan_config_id": self.plan_config_id,
            "provider": self.provider,
            "amount": self.amount,
            "status": self.status,
            "external_id": self.external_id,
            "checkout_url": self.checkout_url,
            "description": self.description,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


__all__ = [
    "PaymentProvider",
    "TransactionStatus",
    "PaymentGatewayConfig",
    "PaymentTransaction",
]
