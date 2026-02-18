"""
Live Quiz Models - Kahoot/Quizizz style real-time quiz system
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import secrets
import string
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id, generate_pin


# ============================================================
# ENUMS
# ============================================================

class LiveQuizStatus(str, enum.Enum):
    """Live quiz status"""
    created = "created"       # Yaratilgan
    waiting = "waiting"       # Qatnashchilar kutilmoqda
    active = "active"         # O'tmoqda
    paused = "paused"         # To'xtatilgan
    finished = "finished"     # Tugagan


class ParticipantState(str, enum.Enum):
    """Participant state in live quiz"""
    joined = "joined"         # Qo'shilgan
    ready = "ready"           # Tayyor
    answering = "answering"   # Javob bermoqda
    waiting = "waiting"       # Keyingi savolni kutmoqda
    finished = "finished"     # Tugatgan
    disconnected = "disconnected"  # Ulanish uzilgan


# ============================================================
# LIVE QUIZ
# ============================================================

class LiveQuiz(Base):
    """
    Live Quiz session - Kahoot/Quizizz uslubidagi real-time quiz
    Maximum 40 participants (one classroom).
    """
    __tablename__ = "live_quizzes"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    
    # O'qituvchi
    teacher_id = Column(String(8), ForeignKey("teacher_profiles.id"), nullable=False)
    
    # Quiz ma'lumotlari
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    
    # Qo'shilish kodlari
    join_code = Column(String(6), unique=True, nullable=False)  # 6 xonali kod
    qr_code_data = Column(Text, nullable=True)  # QR kod ma'lumotlari
    
    # Sozlamalar
    max_participants = Column(Integer, default=40)  # Maksimum 40 o'quvchi
    time_per_question = Column(Integer, default=30)  # Har bir savol uchun vaqt (soniya)
    show_leaderboard = Column(Boolean, default=True)
    shuffle_questions = Column(Boolean, default=False)
    shuffle_options = Column(Boolean, default=False)
    
    # Status
    status = Column(SQLEnum(LiveQuizStatus), default=LiveQuizStatus.created)
    current_question_index = Column(Integer, default=0)
    
    # Vaqtlar
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    teacher = relationship("TeacherProfile", backref="live_quizzes")
    questions = relationship("LiveQuizQuestion", back_populates="quiz", cascade="all, delete-orphan", order_by="LiveQuizQuestion.order")
    participants = relationship("LiveQuizParticipant", back_populates="quiz", cascade="all, delete-orphan")
    
    @staticmethod
    def generate_join_code(length: int = 6) -> str:
        """Generate unique 6-digit join code"""
        return generate_pin(length)
    
    def __repr__(self):
        return f"<LiveQuiz {self.join_code} ({self.status.value})>"


# ============================================================
# LIVE QUIZ QUESTION
# ============================================================

class LiveQuizQuestion(Base):
    """
    Live Quiz question - Real-time quiz savollari
    """
    __tablename__ = "live_quiz_questions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    quiz_id = Column(String(8), ForeignKey("live_quizzes.id"), nullable=False)
    
    # Savol ma'lumotlari
    question_text = Column(Text, nullable=False)
    question_image = Column(String(500), nullable=True)
    options = Column(JSON, nullable=False)  # ["A variant", "B variant", "C variant", "D variant"]
    correct_answer = Column(Integer, nullable=False)  # 0, 1, 2, 3
    
    # Ball va vaqt
    points = Column(Integer, default=100)  # Maksimum ball
    time_limit = Column(Integer, default=30)  # Soniyalarda
    order = Column(Integer, default=0)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    quiz = relationship("LiveQuiz", back_populates="questions")
    answers = relationship("LiveQuizAnswer", back_populates="question", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<LiveQuizQuestion {self.order + 1}>"


# ============================================================
# LIVE QUIZ PARTICIPANT
# ============================================================

class LiveQuizParticipant(Base):
    """
    Live Quiz participant - Qatnashchi (o'quvchi)
    """
    __tablename__ = "live_quiz_participants"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    quiz_id = Column(String(8), ForeignKey("live_quizzes.id"), nullable=False)
    student_id = Column(String(8), ForeignKey("student_profiles.id"), nullable=False)
    
    # Nickname (Kahoot uslubida)
    display_name = Column(String(50), nullable=False)
    avatar_emoji = Column(String(10), default="🎮")  # Emoji avatar
    
    # Status
    state = Column(SQLEnum(ParticipantState), default=ParticipantState.joined)
    
    # Natijalar
    total_score = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    wrong_count = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)  # Ketma-ket to'g'ri javoblar
    best_streak = Column(Integer, default=0)
    rank = Column(Integer, nullable=True)
    
    # Coin (bonus)
    coins_earned = Column(Integer, default=0)
    
    # Vaqtlar
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    quiz = relationship("LiveQuiz", back_populates="participants")
    student = relationship("StudentProfile", backref="live_quiz_participations")
    answers = relationship("LiveQuizAnswer", back_populates="participant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<LiveQuizParticipant {self.display_name} score={self.total_score}>"


# ============================================================
# LIVE QUIZ ANSWER
# ============================================================

class LiveQuizAnswer(Base):
    """
    Live Quiz answer - Qatnashchining javoblari
    """
    __tablename__ = "live_quiz_answers"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    participant_id = Column(String(8), ForeignKey("live_quiz_participants.id"), nullable=False)
    question_id = Column(String(8), ForeignKey("live_quiz_questions.id"), nullable=False)
    
    # Javob
    selected_answer = Column(Integer, nullable=True)  # 0, 1, 2, 3 yoki null
    is_correct = Column(Boolean, default=False)
    
    # Ball (tezlikka qarab)
    points_earned = Column(Integer, default=0)
    time_to_answer_ms = Column(Integer, default=0)  # Millisekundlarda
    
    # Timestamp
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    participant = relationship("LiveQuizParticipant", back_populates="answers")
    question = relationship("LiveQuizQuestion", back_populates="answers")
    
    def __repr__(self):
        return f"<LiveQuizAnswer correct={self.is_correct} points={self.points_earned}>"
