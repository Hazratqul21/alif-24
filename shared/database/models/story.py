from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class Story(Base):
    __tablename__ = "ertaklar"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    teacher_id = Column(String(8), ForeignKey("teacher_profiles.id", use_alter=True, name="fk_story_teacher"), nullable=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(5), default="uz")
    age_group = Column(String(10), default="6-8")
    has_audio = Column(Boolean, default=False)
    audio_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True) # Rasm yuklanishi uchun qator
    view_count = Column(Integer, default=0)
    # Savollar: [{"question": "...", "answer": "..."}]
    questions = Column(JSON, nullable=True, default=lambda: [])
    # Test: [{"question": "...", "options": ["A","B","C","D"], "correct": 0}]
    test = Column(JSON, nullable=True, default=lambda: [])
    # Savollar va testlar cheklovlari (random shaklda berilishi uchun)
    questions_limit = Column(Integer, default=3, nullable=True)
    test_limit = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class StoryReadingRecord(Base):
    """
    O'quvchining ertakni o'qib bo'lganligi haqida yozuv.
    Kutubxonada 'o'qilgan' kitoblarni ko'rsatish uchun.
    """
    __tablename__ = "story_reading_records"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    story_id = Column(String(8), ForeignKey("ertaklar.id", ondelete="CASCADE"), nullable=False)
    
    # Natija ma'lumotlari (ixtiyoriy)
    wpm = Column(Integer, nullable=True)
    quiz_score = Column(Integer, nullable=True)
    test_score = Column(Integer, nullable=True)
    
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User", foreign_keys=[student_user_id])
    story = relationship("Story", foreign_keys=[story_id])

