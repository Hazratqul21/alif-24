from sqlalchemy import Column, Integer, Float, DateTime, Text, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class ProgressStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Progress(Base):
    __tablename__ = "progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)  # Fixed: student_profiles
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Fixed: users instead of profiles
    status = Column(SQLEnum(ProgressStatus), default=ProgressStatus.NOT_STARTED)
    score = Column(Float, default=0.0)
    points_earned = Column(Integer, default=0)
    time_spent = Column(Integer, default=0)  # seconds
    attempts = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    answers = Column(JSON, default=[])
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - Fixed: StudentProfile instead of Student
    student = relationship("StudentProfile", back_populates="progress", foreign_keys=[student_id])
    lesson = relationship("Lesson", foreign_keys=[lesson_id])  # Removed back_populates
    # profile = relationship("User", foreign_keys=[profile_id])  # Commented out for now

