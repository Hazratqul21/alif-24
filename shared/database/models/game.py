"""
Game Models - O'yinlar tizimi
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, JSON, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class GameType(str, enum.Enum):
    PUZZLE = "puzzle"
    MEMORY = "memory"
    MATCHING = "matching"
    QUIZ = "quiz"
    ADVENTURE = "adventure"
    COUNTING = "counting"
    SPELLING = "spelling"


class Game(Base):
    """
    O'yin katalogi
    """
    __tablename__ = "games"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    subject_id = Column(String(8), ForeignKey("subjects.id"), nullable=True)
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
    config = Column(JSON, nullable=True)
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

    def __repr__(self):
        return f"<Game {self.name} ({self.type.value})>"


class GameSession(Base):
    """
    O'yin sessiyasi - o'quvchi o'yin o'ynagan vaqtda
    """
    __tablename__ = "game_sessions"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_id = Column(String(8), ForeignKey("student_profiles.id"), nullable=False)
    game_id = Column(String(8), ForeignKey("games.id"), nullable=False)
    profile_id = Column(String(8), ForeignKey("users.id"), nullable=True)
    score = Column(Integer, default=0)
    points_earned = Column(Integer, default=0)
    time_spent = Column(Integer, default=0)  # seconds
    level = Column(Integer, default=1)
    is_completed = Column(Boolean, default=False)
    game_data = Column(JSON, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    student = relationship("StudentProfile", back_populates="game_sessions", foreign_keys=[student_id])
    game = relationship("Game", back_populates="sessions", foreign_keys=[game_id])
    
    def __repr__(self):
        return f"<GameSession student={self.student_id} game={self.game_id}>"


__all__ = ["GameType", "Game", "GameSession"]
