"""
Analytics Models - Geolocation, Audit Log, Admin Notifications
Alif24 Smart Admin Panel uchun
"""
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, Text, JSON, Index, ForeignKey
from sqlalchemy.sql import func
import uuid
from shared.database.base import Base


class UserGeoLog(Base):
    """
    Foydalanuvchi geolokatsiyasi (IP-based)
    Har safar login/refresh qilganda yoziladi
    """
    __tablename__ = "user_geo_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # IP ma'lumotlari
    ip_address = Column(String(45), nullable=True)  # IPv6 uchun 45 char
    
    # Geolokatsiya (IP-based)
    country = Column(String(100), nullable=True)
    country_code = Column(String(5), nullable=True)
    region = Column(String(100), nullable=True)      # Viloyat
    city = Column(String(100), nullable=True)         # Shahar
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    isp = Column(String(200), nullable=True)          # Internet provayder
    
    # Qurilma ma'lumotlari
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(20), nullable=True)   # mobile, desktop, tablet
    browser = Column(String(50), nullable=True)
    os = Column(String(50), nullable=True)
    
    # Sessiya
    action = Column(String(20), default="login")      # login, refresh, page_view
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_geo_user_created", "user_id", "created_at"),
        Index("idx_geo_region", "region"),
        Index("idx_geo_city", "city"),
    )


class AuditLog(Base):
    """
    Admin harakatlari logi
    Har bir admin amali yoziladi
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Kim qildi
    admin_role = Column(String(20), nullable=False)    # hazratqul, nurali, pedagog
    
    # Nima qildi
    action = Column(String(50), nullable=False)        # user.create, plan.update, sub.assign, ...
    action_type = Column(String(20), default="info")   # info, warning, danger
    
    # Kimga / nimaga
    target_type = Column(String(50), nullable=True)    # user, plan, subscription, promo_code, ...
    target_id = Column(String(100), nullable=True)     # ID of affected entity
    target_name = Column(String(200), nullable=True)   # Human readable name
    
    # Tafsilotlar
    details = Column(JSON, nullable=True)              # {old: {...}, new: {...}}
    ip_address = Column(String(45), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_audit_admin", "admin_role"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_created", "created_at"),
    )


class AdminNotification(Base):
    """
    Admin uchun bildirishnomalar
    Smart events: yangi teacher, obuna tugayapti, anomaliya, etc.
    """
    __tablename__ = "admin_notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    category = Column(String(30), default="info")      # info, warning, danger, success
    
    # Kimga
    target_role = Column(String(20), nullable=True)    # null = hammaga, yoki hazratqul, nurali, pedagog
    
    # Link
    action_url = Column(String(500), nullable=True)    # /admin/users/12345678
    
    is_read = Column(Boolean, default=False)
    read_by = Column(JSON, default=list)               # ["hazratqul", "nurali"]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


__all__ = [
    "UserGeoLog",
    "AuditLog",
    "AdminNotification",
]
