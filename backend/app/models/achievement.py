from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base

class AchievementType(str, enum.Enum):
    BADGE = "badge"
    TROPHY = "trophy"
    CERTIFICATE = "certificate"
    MILESTONE = "milestone"

class AchievementCategory(str, enum.Enum):
    LEARNING = "learning"
    STREAK = "streak"
    SOCIAL = "social"
    GAME = "game"
    SPECIAL = "special"

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    name_uz = Column(String(100), nullable=False)
    name_ru = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    description_ru = Column(Text, nullable=True)
    icon = Column(String(500), nullable=True)
    type = Column(SQLEnum(AchievementType), default=AchievementType.BADGE)
    category = Column(SQLEnum(AchievementCategory), default=AchievementCategory.LEARNING)
    criteria = Column(JSON, default={})
    points_reward = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    students = relationship("StudentAchievement", back_populates="achievement", foreign_keys="StudentAchievement.achievement_id")

