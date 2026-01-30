"""
Test Models - O'qituvchi yaratadigan testlar va natijalar
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Float, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
# from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base


class TestType(str, enum.Enum):
    """Test turlari"""
    MULTIPLE_CHOICE = "multiple_choice"  # Ko'p tanlovli
    TRUE_FALSE = "true_false"  # To'g'ri/Noto'g'ri
    SHORT_ANSWER = "short_answer"  # Qisqa javob
    MATCHING = "matching"  # Moslashtirish
    MIXED = "mixed"  # Aralash


class TeacherTest(Base):
    """O'qituvchi testlari"""
    __tablename__ = "teacher_tests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # O'qituvchi va dars
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("teacher_lessons.id"), nullable=True)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=True)
    
    # Test structure
    test_type = Column(SQLEnum(TestType), nullable=False, default=TestType.MULTIPLE_CHOICE)
    questions = Column(JSON, nullable=False, default=[])
    # Format: [
    #   {
    #     "id": 1,
    #     "question": "2 + 2 = ?",
    #     "type": "multiple_choice",
    #     "options": ["3", "4", "5", "6"],
    #     "correct_answer": "4",
    #     "points": 10
    #   }
    # ]
    
    # Settings
    total_points = Column(Integer, default=100)
    passing_score = Column(Integer, default=60)  # Minimal ball (%)
    time_limit_minutes = Column(Integer, nullable=True)  # Vaqt chegarasi (daqiqa)
    attempts_allowed = Column(Integer, default=1)  # Necha marta topshirish mumkin
    is_active = Column(Boolean, default=True)
    show_correct_answers = Column(Boolean, default=True)  # Javoblarni ko'rsatish
    
    # Schedule
    available_from = Column(DateTime(timezone=True), nullable=True)
    available_until = Column(DateTime(timezone=True), nullable=True)
    
    # TestAI Integration Fields
    category = Column(String(100), nullable=True, default="general")
    tags = Column(JSON, default=[])  # Tags list

    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    teacher = relationship("User", foreign_keys=[teacher_id])
    lesson = relationship("TeacherLesson", back_populates="tests")
    classroom = relationship("Classroom", backref="tests")
    results = relationship("TestResult", back_populates="test", cascade="all, delete-orphan")


class TestResult(Base):
    """Test natijalari"""
    __tablename__ = "test_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    test_id = Column(UUID(as_uuid=True), ForeignKey("teacher_tests.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Attempt info
    attempt_number = Column(Integer, default=1)  # Nechinchi urinish
    
    # Answers
    answers = Column(JSON, nullable=False, default={})
    # Format: {"1": "4", "2": "true", "3": "Paris"}
    
    # Scoring
    score = Column(Integer, nullable=False)  # To'plagan ball
    max_score = Column(Integer, nullable=False)  # Maksimal ball
    percentage = Column(Float, nullable=False)  # Foiz
    passed = Column(Boolean, default=False)  # O'tdimi
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_minutes = Column(Integer, nullable=True)
    
    # Grading
    auto_graded = Column(Boolean, default=True)  # Avtomatik baholandi
    teacher_comment = Column(Text, nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    test = relationship("TeacherTest", back_populates="results")
    student = relationship("User", foreign_keys=[student_id])
