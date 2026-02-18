"""
Lessions Platform - Database Models
Darsliklar va ertaklar uchun PostgreSQL modellari
"""
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class LessonStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    subject_id = Column(String(8), ForeignKey("subjects.id", use_alter=True, name="fk_lesson_subject"), nullable=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    grade_level = Column(String(20), nullable=True)
    difficulty = Column(String(20), default="medium")
    duration_minutes = Column(Integer, default=30)
    language = Column(String(5), default="uz")
    status = Column(Enum(LessonStatus), default=LessonStatus.draft)
    view_count = Column(Integer, default=0)
    completion_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    subject_ref = relationship("Subject", back_populates="lessons", foreign_keys=[subject_id])
    progress = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    lesson_id = Column(String(8), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=True)
    progress_percent = Column(Integer, default=0)
    time_spent_minutes = Column(Integer, default=0)
    completed = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lesson = relationship("Lesson", back_populates="progress")


class Ertak(Base):
    __tablename__ = "ertaklar"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(5), default="uz")
    age_group = Column(String(10), default="6-8")
    has_audio = Column(Boolean, default=False)
    audio_url = Column(String(500), nullable=True)
    view_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
