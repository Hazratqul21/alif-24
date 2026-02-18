"""
Notification Models - Xabarnomalar tizimi
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class NotificationType(str, enum.Enum):
    SMS = "sms"
    TELEGRAM = "telegram"
    EMAIL = "email"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class NotificationLog(Base):
    """
    Xabarnomalar log'i - barcha yuborilgan xabarnomalar
    """
    __tablename__ = "notification_logs"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id"), nullable=True)
    notification_type = Column(SQLEnum(NotificationType), nullable=False)
    recipient = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(SQLEnum(NotificationStatus), default=NotificationStatus.PENDING)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<NotificationLog {self.notification_type.value} to {self.recipient}>"


__all__ = ["NotificationType", "NotificationStatus", "NotificationLog"]
