"""
Subject Model - Fanlar tizimi
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class Subject(Base):
    """
    Fan/Mavzu modeli
    """
    __tablename__ = "subjects"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    name = Column(String(100), nullable=False)
    name_uz = Column(String(100), nullable=False)
    name_ru = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    description_ru = Column(Text, nullable=True)
    icon = Column(String(500), nullable=True)
    color = Column(String(20), default="#4A90A4")
    order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    age_range = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    # lessons = relationship("Lesson", back_populates="subject_ref")
    games = relationship("Game", back_populates="subject")

    def __repr__(self):
        return f"<Subject {self.name}>"


__all__ = ["Subject"]
