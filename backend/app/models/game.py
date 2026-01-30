from sqlalchemy import Column, String, Text, Integer, Float, Boolean, JSON, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class GameType(str, enum.Enum):
    PUZZLE = "puzzle"
    MEMORY = "memory"
    MATCHING = "matching"
    QUIZ = "quiz"
    ADVENTURE = "adventure"
    COUNTING = "counting"
    SPELLING = "spelling"

class Game(Base):
    __tablename__ = "games"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    name = Column(String(200), nullable=False)
    name_uz = Column(String(200), nullable=False)
    name_ru = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    description_ru = Column(Text, nullable=True)
    type = Column(SQLEnum(GameType), default=GameType.PUZZLE)
    level = Column(Integer, default=1)
    age_min = Column(Integer, default=4)
    age_max = Column(Integer, default=7)
    config = Column(JSON, default={})
    thumbnail = Column(String(500), nullable=True)
    points_reward = Column(Integer, default=5)
    time_limit = Column(Integer, default=0)  # 0 = no limit
    is_active = Column(Boolean, default=True)
    total_plays = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    subject = relationship("Subject", back_populates="games", foreign_keys=[subject_id])
    sessions = relationship("GameSession", back_populates="game", foreign_keys="GameSession.game_id")

