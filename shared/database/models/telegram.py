"""
Phone Verification and Telegram Models
Telefon raqamini tasdiqlash va Telegram foydalanuvchi modellari
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.sql import func
import secrets
import string
from datetime import datetime, timedelta, timezone
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class PhoneVerification(Base):
    """
    Phone verification code storage
    Telefon raqamini tasdiqlash kodi
    """
    __tablename__ = "phone_verifications"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    
    # Phone number in international format (+998901234567)
    phone = Column(String(20), nullable=False, index=True)
    
    # 6-digit verification code
    code = Column(String(6), nullable=False)
    
    # Telegram chat ID (linked when user starts bot with phone)
    telegram_chat_id = Column(String(50), nullable=True)
    
    # Verification status
    verified = Column(Boolean, default=False)
    
    # Attempt tracking (prevent brute force)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=5)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<PhoneVerification phone={self.phone} verified={self.verified}>"
    
    @staticmethod
    def generate_code(length: int = 6) -> str:
        """Generate random numeric verification code"""
        from shared.database.id_generator import generate_pin
        return generate_pin(length)
    
    @classmethod
    def create_for_phone(cls, phone: str, expires_minutes: int = 5) -> 'PhoneVerification':
        """
        Create new verification for phone number
        
        Args:
            phone: Phone number in international format
            expires_minutes: Code validity in minutes
            
        Returns:
            New PhoneVerification instance
        """
        return cls(
            phone=phone,
            code=cls.generate_code(),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
        )
    
    def is_expired(self) -> bool:
        """Check if verification code has expired"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def can_attempt(self) -> bool:
        """Check if more attempts are allowed"""
        return self.attempts < self.max_attempts
    
    def verify(self, code: str) -> bool:
        """
        Attempt to verify with given code
        
        Args:
            code: The verification code to check
            
        Returns:
            True if code matches, False otherwise
        """
        self.attempts += 1
        
        if self.is_expired():
            return False
        
        if not self.can_attempt():
            return False
            
        if self.code == code:
            self.verified = True
            self.verified_at = datetime.now(timezone.utc)
            return True
        
        return False


class TelegramUser(Base):
    """
    Telegram user linking table
    Foydalanuvchi Telegram akkauntini platformaga bog'lash
    """
    __tablename__ = "telegram_users"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    
    # User ID from our platform (nullable until linked)
    user_id = Column(String(8), nullable=True, index=True)
    
    # Telegram details
    telegram_chat_id = Column(String(50), unique=True, nullable=False, index=True)
    telegram_username = Column(String(100), nullable=True)
    telegram_first_name = Column(String(100), nullable=True)
    telegram_last_name = Column(String(100), nullable=True)
    
    # Linked phone (verified)
    phone = Column(String(20), nullable=True, index=True)
    
    # Notification settings
    notifications_enabled = Column(Boolean, default=True)
    daily_report_enabled = Column(Boolean, default=True)
    achievement_alerts_enabled = Column(Boolean, default=True)
    
    # Language preference
    language = Column(String(5), default="uz")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_interaction_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<TelegramUser chat_id={self.telegram_chat_id} user_id={self.user_id}>"
