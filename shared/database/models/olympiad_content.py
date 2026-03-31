"""
Olympiad Content Models - Olimpiada uchun alohida kontentlar
Har bir olimpiadaning o'z dars va ertaklari bo'ladi (umumiy kutubxonaga tushmaydi)
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class OlympiadLesson(Base):
    """Olimpiada uchun alohida dars — faqat shu olimpiada ichida ko'rinadi"""
    __tablename__ = "olympiad_lessons"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olympiads.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(300), nullable=False)
    subject = Column(String(100), nullable=True)
    content = Column(Text, nullable=True)
    grade_level = Column(String(20), nullable=True)
    language = Column(String(10), default="uz")
    video_url = Column(String(500), nullable=True)
    attachments = Column(JSON, nullable=True)  # [{name, url, size}]

    is_published = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    olympiad = relationship("Olympiad", back_populates="content_lessons")

    def __repr__(self):
        return f"<OlympiadLesson {self.title}>"


class OlympiadStory(Base):
    """Olimpiada uchun alohida ertak — faqat shu olimpiada ichida ko'rinadi"""
    __tablename__ = "olympiad_stories"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    olympiad_id = Column(String(8), ForeignKey("olympiads.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    language = Column(String(5), default="uz")
    age_group = Column(String(10), default="6-8")
    has_audio = Column(Boolean, default=False)
    audio_url = Column(String(500), nullable=True)
    image_url = Column(String(500), nullable=True)
    view_count = Column(Integer, default=0)
    questions = Column(JSON, nullable=True, default=list)  # [{"question": "...", "answer": "..."}]
    is_published = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    olympiad = relationship("Olympiad", back_populates="content_stories")

    def __repr__(self):
        return f"<OlympiadStory {self.title}>"
