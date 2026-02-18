"""
Teacher Profile Model - O'qituvchi profili
8 xonalik ID bilan
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id
from shared.database.models.user import TeacherStatus


class TeacherProfile(Base):
    """
    O'qituvchi profili
    Kontent yaratish va sinf boshqarish
    """
    __tablename__ = "teacher_profiles"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Tashkilot bilan bog'lanish
    organization_id = Column(String(8), ForeignKey("organization_profiles.id"), nullable=True)
    
    # Tekshiruv
    verification_status = Column(SQLEnum(TeacherStatus), default=TeacherStatus.pending)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(8), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Kasbiy ma'lumotlar
    specialization = Column(String(200), nullable=True)
    qualification = Column(String(200), nullable=True)
    years_of_experience = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    subjects = Column(JSON, nullable=True)
    
    # Hujjatlar
    diploma_url = Column(String(500), nullable=True)
    certificate_urls = Column(JSON, nullable=True)
    verification_documents = Column(JSON, nullable=True)
    
    # Statistika
    total_students = Column(Integer, default=0)
    total_classrooms = Column(Integer, default=0)
    total_lessons_created = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    
    # Vaqt tamg'alari
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="teacher_profile", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
    organization = relationship("OrganizationProfile", backref="teachers")
    
    def __repr__(self):
        return f"<TeacherProfile user_id={self.user_id} status={self.verification_status.value}>"


__all__ = ["TeacherProfile"]
