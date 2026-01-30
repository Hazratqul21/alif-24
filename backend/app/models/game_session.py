from sqlalchemy import Column, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.core.database import Base

class GameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)  # Fixed
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Fixed
    score = Column(Integer, default=0)
    points_earned = Column(Integer, default=0)
    time_spent = Column(Integer, default=0)  # seconds
    level = Column(Integer, default=1)
    is_completed = Column(Boolean, default=False)
    game_data = Column(JSON, default={})
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - Fixed
    student = relationship("StudentProfile", back_populates="game_sessions", foreign_keys=[student_id])
    game = relationship("Game", foreign_keys=[game_id])
    # profile = relationship("User", foreign_keys=[profile_id])

