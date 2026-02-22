"""
InAppNotification Model - Platforma ichidagi xabarnomalar
Real-time (SSE/polling) orqali foydalanuvchiga ko'rsatiladi
"""
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class InAppNotifType(str, enum.Enum):
    classroom_invite = "classroom_invite"    # Sinfga taklif
    assignment_new = "assignment_new"        # Yangi vazifa
    assignment_graded = "assignment_graded"  # Vazifa baholandi
    assignment_due = "assignment_due"        # Vazifa muddati yaqin
    submission_received = "submission_received"  # O'qituvchiga: topshiruv keldi
    system = "system"                        # Tizim xabari
    achievement = "achievement"              # Yutuq
    parent_task = "parent_task"              # Ota-onadan vazifa
    parent_invite = "parent_invite"          # Ota-ona farzand sifatida taklif


class InAppNotification(Base):
    """
    Platforma ichidagi xabarnoma
    Polling yoki SSE orqali frontendga yetkaziladi
    """
    __tablename__ = "in_app_notifications"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Kimga
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Xabar
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    notif_type = Column(SQLEnum(InAppNotifType), nullable=False, default=InAppNotifType.system)

    # Reference (qaysi obyektga tegishli)
    reference_type = Column(String(50), nullable=True)   # "classroom", "assignment", "invitation"
    reference_id = Column(String(8), nullable=True)       # tegishli obyekt ID si

    # Holat
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Kim yubordi (agar mavjud)
    sender_id = Column(String(8), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    sender = relationship("User", foreign_keys=[sender_id])

    def __repr__(self):
        return f"<InAppNotification {self.notif_type.value} to={self.user_id} read={self.is_read}>"

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.notif_type.value,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "is_read": self.is_read,
            "sender_id": self.sender_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


__all__ = ["InAppNotification", "InAppNotifType"]
