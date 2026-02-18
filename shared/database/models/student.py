"""
Student Profile Model - O'quvchi profili (4-7 yosh)
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id
from shared.database.models.user import ChildRelationship


class StudentProfile(Base):
    """
    O'quvchi profili (4-7 yosh)
    Ota-ona akkauntiga bog'langan
    """
    __tablename__ = "student_profiles"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Ota-ona bilan aloqa
    parent_user_id = Column(String(8), ForeignKey("users.id"), nullable=True)
    relationship_type = Column(SQLEnum(ChildRelationship), default=ChildRelationship.guardian)

    # Tashkilot bilan bog'lanish
    organization_id = Column(String(8), ForeignKey("organization_profiles.id"), nullable=True)
    
    # Ta'lim ma'lumotlari
    grade = Column(String(20), nullable=True)
    school_name = Column(String(200), nullable=True)
    
    # Gamification (o'yin elementlari)
    level = Column(Integer, default=1)
    total_points = Column(Integer, default=0)
    total_coins = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)     # Joriy ketma-ketlik (kun)
    longest_streak = Column(Integer, default=0)     # Eng uzun ketma-ketlik
    
    # O'quv jarayoni
    total_lessons_completed = Column(Integer, default=0)
    total_games_played = Column(Integer, default=0)
    total_time_spent = Column(Integer, default=0)  # daqiqalarda
    average_score = Column(Float, default=0.0)
    
    # Xohish-istaklar va sozlamalar
    favorite_subjects = Column(JSON, nullable=True)
    avatar_id = Column(String(8), nullable=True)
    preferences = Column(JSON, nullable=True)
    
    # Ota-ona nazorati (ota-onadan meros)
    screen_time_limit = Column(Integer, default=60)  # kuniga daqiqalar
    is_restricted = Column(Boolean, default=False)
    
    # Vaqt tamg'alari
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    parent_user = relationship("User", foreign_keys=[parent_user_id])
    organization = relationship("OrganizationProfile", backref="students")
    game_sessions = relationship("GameSession", back_populates="student", foreign_keys="GameSession.student_id")
    
    def __repr__(self):
        return f"<StudentProfile user_id={self.user_id} level={self.level}>"


__all__ = ["StudentProfile"]
