from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id

class Book(Base):
    __tablename__ = "kitoblar"
    __table_args__ = {'extend_existing': True}

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    teacher_id = Column(String(8), ForeignKey("teacher_profiles.id", use_alter=True, name="fk_book_teacher"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(5), default="uz")
    age_group = Column(String(10), default="6-8")
    pdf_url = Column(String(500), nullable=False)
    image_url = Column(String(500), nullable=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    view_count = Column(Integer, default=0)
    questions = Column(JSON, nullable=True, default=lambda: [])
    test = Column(JSON, nullable=True, default=lambda: [])
    questions_limit = Column(Integer, default=3, nullable=True)
    test_limit = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "title": self.title,
            "description": self.description,
            "language": self.language,
            "age_group": self.age_group,
            "pdf_url": self.pdf_url,
            "image_url": self.image_url,
            "is_premium": bool(self.is_premium),
            "view_count": self.view_count,
            "questions": self.questions or [],
            "test": self.test or [],
            "questions_limit": self.questions_limit,
            "test_limit": self.test_limit,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class BookReadingRecord(Base):
    __tablename__ = "book_reading_records"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book_id = Column(String(8), ForeignKey("kitoblar.id", ondelete="CASCADE"), nullable=False)
    
    quiz_score = Column(Integer, nullable=True)
    test_score = Column(Integer, nullable=True)
    
    # Reading Rating system fields
    max_score = Column(Integer, default=0, nullable=False)
    is_counted = Column(Boolean, default=False, nullable=False)
    source_type = Column(String(20), default="library", nullable=False) # library or assignment
    
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("User", foreign_keys=[student_user_id])
    book = relationship("Book", foreign_keys=[book_id])
