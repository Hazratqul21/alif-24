from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid

from shared.database.base import Base

class RatingPeriod(str, enum.Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"
    all_time = "all_time"

class ReadingRating(Base):
    __tablename__ = "reading_ratings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    period = Column(SQLEnum(RatingPeriod), nullable=False)
    # yyyy-Www for weekly (e.g. 2026-W22), yyyy-mm for monthly, yyyy for yearly, or empty for all_time
    period_key = Column(String(20), nullable=False, default="")
    
    total_books = Column(Integer, default=0, nullable=False)
    total_score = Column(Integer, default=0, nullable=False)
    
    # Store points from previous period to calculate "Fastest improving student"
    previous_score = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # Relationships
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (
        Index("idx_reading_rating_student_period", "student_id", "period", "period_key", unique=True),
        Index("idx_reading_rating_leaderboard", "period", "period_key", "total_score", "total_books"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "period": self.period.value,
            "period_key": self.period_key,
            "total_books": self.total_books,
            "total_score": self.total_score,
            "previous_score": self.previous_score,
            "growth": self.total_score - self.previous_score if self.previous_score > 0 else 0,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

__all__ = ["ReadingRating", "RatingPeriod"]
