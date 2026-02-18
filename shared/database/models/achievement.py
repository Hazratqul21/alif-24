"""
Achievement Models - Yutuqlar tizimi
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


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
    """
    Yutiq katalogi - Platformadagi barcha yutuqlar
    """
    __tablename__ = "achievements"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    name = Column(String(100), nullable=False)
    name_uz = Column(String(100), nullable=False)
    name_ru = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    description_ru = Column(Text, nullable=True)
    icon = Column(String(500), nullable=True)
    type = Column(SQLEnum(AchievementType), default=AchievementType.BADGE)
    category = Column(SQLEnum(AchievementCategory), default=AchievementCategory.LEARNING)
    criteria = Column(JSON, nullable=True)  # {"lessons_completed": 10, "games_played": 5}
    points_reward = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    students = relationship("StudentAchievement", back_populates="achievement", foreign_keys="StudentAchievement.achievement_id")

    def __repr__(self):
        return f"<Achievement {self.name} ({self.type.value})>"


class StudentAchievement(Base):
    """
    O'quvchining yutuq qo'lga kiritishi
    """
    __tablename__ = "student_achievements"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    student_id = Column(String(8), ForeignKey("student_profiles.id"), nullable=False)
    achievement_id = Column(String(8), ForeignKey("achievements.id"), nullable=False)
    
    # Progress
    progress_current = Column(Integer, default=0)  # Joriy progress
    progress_target = Column(Integer, default=100)  # Maqsad
    is_completed = Column(Boolean, default=False)
    
    # Vaqt tamg'alari
    earned_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    student = relationship("StudentProfile", backref="achievements")
    achievement = relationship("Achievement", back_populates="students")
    
    def __repr__(self):
        return f"<StudentAchievement student={self.student_id} achievement={self.achievement_id}>"


__all__ = [
    "AchievementType",
    "AchievementCategory", 
    "Achievement",
    "StudentAchievement"
]
