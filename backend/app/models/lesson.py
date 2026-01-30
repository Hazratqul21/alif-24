from sqlalchemy import Column, String, Text, Integer, Float, Boolean, JSON, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class LessonType(str, enum.Enum):
    VIDEO = "video"
    INTERACTIVE = "interactive"
    READING = "reading"
    QUIZ = "quiz"
    ACTIVITY = "activity"

class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=True)  # Fixed: teacher_profiles instead of teachers
    title = Column(String(200), nullable=False)
    title_uz = Column(String(200), nullable=False)
    title_ru = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    description_ru = Column(Text, nullable=True)
    content = Column(JSON, default={})
    type = Column(SQLEnum(LessonType), default=LessonType.INTERACTIVE)
    level = Column(Integer, default=1)
    age_min = Column(Integer, default=4)
    age_max = Column(Integer, default=7)
    duration = Column(Integer, default=15)  # minutes
    points_reward = Column(Integer, default=10)
    thumbnail = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_ai_generated = Column(Boolean, default=False)
    total_completions = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships - Fixed: TeacherProfile instead of Teacher
    subject = relationship("Subject", back_populates="lessons", foreign_keys=[subject_id])
    teacher = relationship("TeacherProfile", foreign_keys=[teacher_id])  # Removed back_populates since TeacherProfile doesn't have lessons
    # Progress relationship removed temporarily due to FK mismatch
    # progress = relationship("Progress", back_populates="lesson", foreign_keys="Progress.lesson_id")

