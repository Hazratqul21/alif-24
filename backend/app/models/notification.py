from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class NotificationType(str, enum.Enum):
    ACHIEVEMENT = "achievement"
    REMINDER = "reminder"
    UPDATE = "update"
    ALERT = "alert"
    MESSAGE = "message"

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(NotificationType), default=NotificationType.UPDATE)
    title = Column(String(200), nullable=False)
    title_uz = Column(String(200), nullable=True)
    title_ru = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    message_uz = Column(Text, nullable=True)
    message_ru = Column(Text, nullable=True)
    data = Column(JSON, default={})
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")

