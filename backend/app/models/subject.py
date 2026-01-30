from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
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
    age_range = Column(JSON, default={"min": 4, "max": 7})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lessons = relationship("Lesson", back_populates="subject", foreign_keys="Lesson.subject_id")
    games = relationship("Game", back_populates="subject", foreign_keys="Game.subject_id")

