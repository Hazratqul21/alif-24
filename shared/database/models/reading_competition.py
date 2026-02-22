"""
Reading Competition Models — Haftalik O'qish Musobaqasi
Alif24 Platform

Modellari:
- ReadingCompetition: Haftalik musobaqa (dush-yaksh)
- ReadingTask: Kunlik hikoya (dush, sesh, chor, pay, juma)
- CompetitionTest: Shanba kuni test
- ReadingSession: Bola o'qish sessiyasi
- CompetitionResult: Haftalik yakuniy natija
"""
import enum
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, Date,
    ForeignKey, Enum as SQLEnum, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


# ============================================================
# ENUMS
# ============================================================

class CompetitionStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    scoring = "scoring"
    finished = "finished"
    cancelled = "cancelled"


class TaskDay(str, enum.Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"


class SessionStatus(str, enum.Enum):
    not_started = "not_started"
    reading = "reading"
    questions = "questions"
    completed = "completed"


class ResultGroup(str, enum.Enum):
    fast_reader = "fast_reader"
    accurate_reader = "accurate_reader"
    test_master = "test_master"
    champion = "champion"


# ============================================================
# READING COMPETITION — Haftalik musobaqa
# ============================================================

class ReadingCompetition(Base):
    __tablename__ = "reading_competitions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    week_number = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    grade_level = Column(String(20), nullable=True)
    language = Column(String(10), default="uz")

    status = Column(SQLEnum(CompetitionStatus), default=CompetitionStatus.draft)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    created_by = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tasks = relationship("ReadingTask", back_populates="competition", cascade="all, delete-orphan")
    test = relationship("CompetitionTest", back_populates="competition", uselist=False, cascade="all, delete-orphan")
    results = relationship("CompetitionResult", back_populates="competition", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ReadingCompetition {self.title} week={self.week_number}/{self.year}>"


# ============================================================
# READING TASK — Kunlik hikoya (5 kun)
# ============================================================

class ReadingTask(Base):
    __tablename__ = "reading_tasks"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    competition_id = Column(String(8), ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False)

    day_of_week = Column(SQLEnum(TaskDay), nullable=False)
    title = Column(String(300), nullable=False)
    image_url = Column(String(500), nullable=True)
    story_text = Column(Text, nullable=False)
    total_words = Column(Integer, nullable=False, default=0)

    # Matn bo'yicha savollar
    questions = Column(JSON, nullable=True)
    # Format: [{"question": "...", "options": ["A","B","C","D"], "correct": 0}, ...]

    time_limit_seconds = Column(Integer, nullable=True)
    order_index = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    competition = relationship("ReadingCompetition", back_populates="tasks")
    sessions = relationship("ReadingSession", back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("competition_id", "day_of_week", name="uq_competition_day"),
    )

    def __repr__(self):
        return f"<ReadingTask {self.title} day={self.day_of_week.value}>"


# ============================================================
# COMPETITION TEST — Shanba kuni test
# ============================================================

class CompetitionTest(Base):
    __tablename__ = "competition_tests"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    competition_id = Column(String(8), ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False, unique=True)

    title = Column(String(300), nullable=True)
    # Test savollari — 5 kunlik hikoyalar asosida
    questions = Column(JSON, nullable=True)
    # Format: [{"question": "...", "options": ["A","B","C","D"], "correct": 0}, ...]

    time_limit_minutes = Column(Integer, default=30)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    competition = relationship("ReadingCompetition", back_populates="test")

    def __repr__(self):
        return f"<CompetitionTest comp={self.competition_id}>"


# ============================================================
# READING SESSION — Bola o'qish sessiyasi
# ============================================================

class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(8), ForeignKey("reading_tasks.id", ondelete="CASCADE"), nullable=False)
    competition_id = Column(String(8), ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False)

    status = Column(SQLEnum(SessionStatus), default=SessionStatus.not_started)

    # O'qish ma'lumotlari
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    reading_time_seconds = Column(Float, nullable=True)

    # STT natijalari
    stt_transcript = Column(Text, nullable=True)
    words_read = Column(Integer, default=0)
    total_words = Column(Integer, default=0)
    completion_percentage = Column(Float, default=0.0)

    # Savollar natijalari
    question_answers = Column(JSON, nullable=True)
    questions_correct = Column(Integer, default=0)
    questions_total = Column(Integer, default=0)

    # Ballar (har biri 0-100)
    score_completion = Column(Float, default=0.0)
    score_words = Column(Float, default=0.0)
    score_time = Column(Float, default=0.0)
    score_questions = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("ReadingTask", back_populates="sessions")
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (
        UniqueConstraint("student_id", "task_id", name="uq_student_task"),
    )

    def __repr__(self):
        return f"<ReadingSession student={self.student_id} task={self.task_id} score={self.total_score}>"


# ============================================================
# COMPETITION RESULT — Haftalik yakuniy natija
# ============================================================

class CompetitionResult(Base):
    __tablename__ = "competition_results"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    competition_id = Column(String(8), ForeignKey("reading_competitions.id", ondelete="CASCADE"), nullable=False)

    # 5 kunlik natijalar
    daily_scores = Column(JSON, nullable=True)
    # Format: {"monday": {"score_completion": 90, "score_time": 85, ...}, ...}

    # Shanba test natijasi
    test_score = Column(Float, default=0.0)
    test_answers = Column(JSON, nullable=True)
    test_correct = Column(Integer, default=0)
    test_total = Column(Integer, default=0)

    # Jami
    total_reading_score = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)

    # Guruhlar va o'rinlar
    rank_fast = Column(Integer, nullable=True)
    rank_accurate = Column(Integer, nullable=True)
    rank_test = Column(Integer, nullable=True)
    rank_overall = Column(Integer, nullable=True)
    group = Column(SQLEnum(ResultGroup), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    competition = relationship("ReadingCompetition", back_populates="results")
    student = relationship("User", foreign_keys=[student_id])

    __table_args__ = (
        UniqueConstraint("student_id", "competition_id", name="uq_student_competition"),
    )

    def __repr__(self):
        return f"<CompetitionResult student={self.student_id} total={self.total_score}>"


__all__ = [
    "ReadingCompetition", "ReadingTask", "CompetitionTest",
    "ReadingSession", "CompetitionResult",
    "CompetitionStatus", "TaskDay", "SessionStatus", "ResultGroup",
]
