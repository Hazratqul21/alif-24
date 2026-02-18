"""
Olimp Platform - Database Models
Olimpiadalar uchun PostgreSQL modellari
"""
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

import sys
from pathlib import Path
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class OlympiadStatus(str, enum.Enum):
    upcoming = "upcoming"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class OlympiadDifficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Olympiad(Base):
    __tablename__ = "olimp_olympiads"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(Enum(OlympiadDifficulty), default=OlympiadDifficulty.medium)
    grade_level = Column(String(20), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, default=60)
    max_participants = Column(Integer, default=100)
    status = Column(Enum(OlympiadStatus), default=OlympiadStatus.upcoming)
    rules = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    questions = relationship("OlympiadQuestion", back_populates="olympiad", cascade="all, delete-orphan")
    registrations = relationship("OlympiadRegistration", back_populates="olympiad", cascade="all, delete-orphan")
    results = relationship("OlympiadResult", back_populates="olympiad", cascade="all, delete-orphan")


class OlympiadQuestion(Base):
    __tablename__ = "olimp_olympiad_questions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olimp_olympiads.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(Integer, nullable=False)
    points = Column(Integer, default=10)
    order_index = Column(Integer, default=0)
    explanation = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    olympiad = relationship("Olympiad", back_populates="questions")


class OlympiadRegistration(Base):
    __tablename__ = "olimp_olympiad_registrations"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olimp_olympiads.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())

    olympiad = relationship("Olympiad", back_populates="registrations")


class OlympiadResult(Base):
    __tablename__ = "olimp_olympiad_results"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olimp_olympiads.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(8), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)
    answers = Column(JSON, nullable=True)

    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    olympiad = relationship("Olympiad", back_populates="results")
