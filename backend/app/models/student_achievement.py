from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class StudentAchievement(Base):
    __tablename__ = "student_achievements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)  # Fixed
    achievement_id = Column(UUID(as_uuid=True), ForeignKey("achievements.id"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Fixed
    earned_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships - Fixed
    student = relationship("StudentProfile", back_populates="achievements", foreign_keys=[student_id])
    achievement = relationship("Achievement", foreign_keys=[achievement_id])
    # profile = relationship("User", foreign_keys=[profile_id])

