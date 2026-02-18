"""
Platform Feedback Model - Foydalanuvchilar baholashi
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class PlatformFeedback(Base):
    """
    Foydalanuvchilar platformani baholashi
    Mehmon (ro'yxatdan o'tmagan) ham baho qoldirishi mumkin
    """
    __tablename__ = "platform_feedbacks"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Baholash
    rating = Column(Integer, nullable=False)  # 1-5 yulduz
    comment = Column(Text, nullable=True)

    # Qo'shimcha ma'lumotlar
    page = Column(String(100), nullable=True)  # Qaysi sahifadan (home, dashboard, etc.)
    guest_name = Column(String(100), nullable=True)  # Mehmon ismi (ixtiyoriy)

    # Vaqt
    created_at = Column(DateTime(timezone=True), server_default=func.now())
