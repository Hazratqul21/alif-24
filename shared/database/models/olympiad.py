"""
Olympiad Models - Olimpiada tizimi (to'liq versiya)
8 xonalik ID bilan

Only moderators can create olympiads.
Only monthly subscribers can participate.
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Date, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


# ============================================================
# ENUMS
# ============================================================

class OlympiadType(str, enum.Enum):
    """Olympiad type"""
    test = "test"             # Faqat test savollari
    reading = "reading"       # Faqat o'qish tezligi
    mixed = "mixed"           # Test + O'qish tezligi


class OlympiadStatus(str, enum.Enum):
    """Olympiad status"""
    draft = "draft"           # Yaratilmoqda
    upcoming = "upcoming"     # Kelgusi
    active = "active"         # Faol (o'tmoqda)
    finished = "finished"     # Tugagan
    cancelled = "cancelled"   # Bekor qilingan


class OlympiadSubject(str, enum.Enum):
    """Olympiad subjects"""
    math = "math"               # Matematika
    uzbek = "uzbek"             # O'zbek tili
    russian = "russian"         # Rus tili
    english = "english"         # Ingliz tili
    logic = "logic"             # Mantiq
    general = "general"         # Umumiy bilim


class ParticipationStatus(str, enum.Enum):
    """Participation status"""
    registered = "registered"   # Ro'yxatdan o'tgan
    started = "started"         # Boshlagan
    completed = "completed"     # Tugatgan
    disqualified = "disqualified"  # Diskvalifikatsiya


# ============================================================
# OLYMPIAD MODEL
# ============================================================

class Olympiad(Base):
    """
    Olympiad model - Competitions organized by platform moderators only.
    Only monthly subscribers can participate.
    """
    __tablename__ = "olympiads"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    
    # Asosiy ma'lumotlar
    title = Column(String(300), nullable=False)  # "Matematika Olimpiadasi 2026"
    description = Column(Text, nullable=True)
    subject = Column(SQLEnum(OlympiadSubject), default=OlympiadSubject.general)
    
    # Tur
    type = Column(SQLEnum(OlympiadType), default=OlympiadType.test)
    
    # Yosh chegarasi
    min_age = Column(Integer, default=4)
    max_age = Column(Integer, default=7)
    grade_level = Column(String(20), nullable=True)  # "1-sinf", "2-sinf", etc.
    
    # Vaqt
    registration_start = Column(DateTime(timezone=True), nullable=False)
    registration_end = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=30)  # Har bir qatnashchi uchun
    
    # Sozlamalar
    max_participants = Column(Integer, default=500)
    questions_count = Column(Integer, default=20)
    status = Column(SQLEnum(OlympiadStatus), default=OlympiadStatus.draft)
    results_public = Column(Boolean, default=True)  # Natijalar ochiq
    
    # Tashkilotchi (moderator)
    created_by = Column(String(8), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", backref="created_olympiads", foreign_keys=[created_by])
    questions = relationship("OlympiadQuestion", back_populates="olympiad", cascade="all, delete-orphan")
    participants = relationship("OlympiadParticipant", back_populates="olympiad", cascade="all, delete-orphan")
    reading_tasks = relationship("OlympiadReadingTask", back_populates="olympiad", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Olympiad {self.title} ({self.status.value})>"


# ============================================================
# OLYMPIAD QUESTION
# ============================================================

class OlympiadQuestion(Base):
    """
    Olympiad question - Test savollari
    """
    __tablename__ = "olympiad_questions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olympiads.id"), nullable=False)
    
    # Savol ma'lumotlari
    question_text = Column(Text, nullable=False)
    question_image = Column(String(500), nullable=True)  # Rasm URL
    options = Column(JSON, nullable=False)  # ["A variant", "B variant", "C variant", "D variant"]
    correct_answer = Column(Integer, nullable=False)  # 0, 1, 2, 3 (index)
    points = Column(Integer, default=5)  # Har bir savol uchun ball
    order = Column(Integer, default=0)  # Savol tartibi
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    olympiad = relationship("Olympiad", back_populates="questions")
    answers = relationship("OlympiadAnswer", back_populates="question", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<OlympiadQuestion {self.order + 1}>"


# ============================================================
# OLYMPIAD PARTICIPANT
# ============================================================

class OlympiadParticipant(Base):
    """
    Olympiad participant - Qatnashchi
    Only students with active monthly subscription can participate.
    """
    __tablename__ = "olympiad_participants"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olympiads.id"), nullable=False)
    student_id = Column(String(8), ForeignKey("student_profiles.id"), nullable=False)
    
    # Status
    status = Column(SQLEnum(ParticipationStatus), default=ParticipationStatus.registered)
    
    # Vaqtlar
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Natijalar
    total_score = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    wrong_answers = Column(Integer, default=0)
    time_spent_seconds = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)  # O'rin (1, 2, 3, ...)
    
    # Coin mukofoti
    coins_earned = Column(Integer, default=0)
    
    # Relationships
    olympiad = relationship("Olympiad", back_populates="participants")
    student = relationship("StudentProfile", backref="olympiad_participations")
    answers = relationship("OlympiadAnswer", back_populates="participant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<OlympiadParticipant rank={self.rank}>"


# ============================================================
# OLYMPIAD ANSWER
# ============================================================

class OlympiadAnswer(Base):
    """
    Olympiad answer - Qatnashchining javoblari
    """
    __tablename__ = "olympiad_answers"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    participant_id = Column(String(8), ForeignKey("olympiad_participants.id"), nullable=False)
    question_id = Column(String(8), ForeignKey("olympiad_questions.id"), nullable=False)
    
    # Javob
    selected_answer = Column(Integer, nullable=True)  # 0, 1, 2, 3 yoki null (javob berilmagan)
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Integer, default=0)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    time_spent_seconds = Column(Integer, default=0)  # Bu savolga sarflangan vaqt
    
    # Relationships
    participant = relationship("OlympiadParticipant", back_populates="answers")
    question = relationship("OlympiadQuestion", back_populates="answers")
    
    def __repr__(self):
        return f"<OlympiadAnswer correct={self.is_correct}>"


# ============================================================
# OLYMPIAD READING TASK
# ============================================================

class OlympiadReadingTask(Base):
    """
    O'qish tezligi vazifasi — Admin matn yuklaydi,
    o'quvchi o'qiydi, ovozi yoziladi, admin baholaydi.
    """
    __tablename__ = "olympiad_reading_tasks"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olympiads.id"), nullable=False)
    
    # Matn
    title = Column(String(300), nullable=False)  # "Hikoya: Kichkintoy va Quyosh"
    text_content = Column(Text, nullable=False)   # O'qiladigan matn
    word_count = Column(Integer, default=0)        # So'zlar soni (avtomatik)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    order = Column(Integer, default=0)
    
    # Tushunish savollari (o'qib bo'lgandan keyin)
    comprehension_questions = Column(JSON, nullable=True)
    # Format: [{"question": "...", "options": ["A","B","C","D"], "correct": 0}]
    
    # Vaqt chegarasi
    time_limit_seconds = Column(Integer, default=300)  # 5 daqiqa default
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    olympiad = relationship("Olympiad", back_populates="reading_tasks")
    submissions = relationship("OlympiadReadingSubmission", back_populates="reading_task", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<OlympiadReadingTask {self.title} ({self.word_count} words)>"


# ============================================================
# OLYMPIAD READING SUBMISSION
# ============================================================

class OlympiadReadingSubmission(Base):
    """
    O'quvchining o'qish natijasi:
    - Audio yozuv URL
    - O'qish tezligi (WPM)
    - Tushunish savollari natijalari
    - Admin bahosi
    """
    __tablename__ = "olympiad_reading_submissions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    participant_id = Column(String(8), ForeignKey("olympiad_participants.id"), nullable=False)
    reading_task_id = Column(String(8), ForeignKey("olympiad_reading_tasks.id"), nullable=False)
    
    # O'qish natijasi
    audio_url = Column(String(500), nullable=True)   # Yozilgan audio fayl URL
    reading_duration_seconds = Column(Integer, default=0)  # O'qishga sarflangan vaqt
    words_per_minute = Column(Float, default=0.0)    # So'z/daqiqa (WPM)
    
    # Tushunish savollari natijalari
    comprehension_answers = Column(JSON, nullable=True)
    comprehension_score = Column(Integer, default=0)  # To'g'ri javoblar soni
    comprehension_total = Column(Integer, default=0)  # Jami savollar
    
    # Admin baholash
    admin_pronunciation_score = Column(Integer, nullable=True)   # Talaffuz (0-10)
    admin_fluency_score = Column(Integer, nullable=True)         # Ravonlik (0-10)
    admin_accuracy_score = Column(Integer, nullable=True)        # Aniqlik (0-10)
    admin_total_score = Column(Integer, nullable=True)           # Umumiy (0-30)
    admin_notes = Column(Text, nullable=True)                    # Admin izohi
    graded_by = Column(String(8), ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Hisoblangan umumiy ball (test + o'qish + admin)
    total_points = Column(Integer, default=0)
    
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    participant = relationship("OlympiadParticipant", backref="reading_submissions")
    reading_task = relationship("OlympiadReadingTask", back_populates="submissions")
    grader = relationship("User", foreign_keys=[graded_by])
    
    def __repr__(self):
        return f"<OlympiadReadingSubmission wpm={self.words_per_minute}>"


__all__ = [
    "OlympiadType",
    "OlympiadStatus",
    "OlympiadSubject",
    "ParticipationStatus",
    "Olympiad",
    "OlympiadQuestion",
    "OlympiadParticipant",
    "OlympiadAnswer",
    "OlympiadReadingTask",
    "OlympiadReadingSubmission",
]
