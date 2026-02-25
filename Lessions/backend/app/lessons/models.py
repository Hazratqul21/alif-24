"""
Lessions Platform - Database Models
Darsliklar va ertaklar uchun PostgreSQL modellari

NOTE: Lesson model is imported from shared — it defines the REAL DB columns.
Only Ertak and LessonProgress are locally defined here.
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

# Re-export shared Lesson model so router keeps working
from shared.database.models.lesson import Lesson


class LessonStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    lesson_id = Column(String(8), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=True)
    progress_percent = Column(Integer, default=0)
    time_spent_minutes = Column(Integer, default=0)
    completed = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lesson = relationship("Lesson", foreign_keys=[lesson_id])


class Ertak(Base):
    __tablename__ = "ertaklar"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(5), default="uz")
    age_group = Column(String(10), default="6-8")
    has_audio = Column(Boolean, default=False)
    audio_url = Column(String(500), nullable=True)
    view_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
