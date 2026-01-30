"""
TeacherLesson Model - O'qituvchi yaratadigan darslar (join code bilan)
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Enum as SQLEnum, JSON
from sqlalchemy.dialects.postgresql import UUID
# from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import secrets
import enum
from app.core.database import Base


class TeacherLessonType(str, enum.Enum):
    """Dars turlari"""
    HARF = "harf"  # O'zbek alifbosi
    RHARF = "rharf"  # Rus alifbosi
    MATH = "math"  # Matematika
    CUSTOM = "custom"  # O'qituvchi o'zi yaratgan


class TeacherLesson(Base):
    """O'qituvchi darslar - join code bilan"""
    __tablename__ = "teacher_lessons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # O'qituvchi va sinf
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=True)
    
    # Join code
    join_code = Column(String(10), unique=True, nullable=False, index=True)
    
    # Content
    lesson_type = Column(SQLEnum(TeacherLessonType), nullable=False, default=TeacherLessonType.CUSTOM)
    content = Column(JSON, nullable=True)
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    max_students = Column(Integer, default=100)
    
    # Schedule
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    teacher = relationship("User", foreign_keys=[teacher_id])
    classroom = relationship("Classroom", backref="teacher_lessons")
    students = relationship("TeacherLessonStudent", back_populates="lesson", cascade="all, delete-orphan")
    tests = relationship("TeacherTest", back_populates="lesson")
    
    @staticmethod
    def generate_join_code():
        """6 xonali unique kod"""
        import string
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


class TeacherLessonStudent(Base):
    """Dars-o'quvchi bog'lanishi"""
    __tablename__ = "teacher_lesson_students"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("teacher_lessons.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Progress
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completion_percentage = Column(Integer, default=0)
    
    # Relationships
    lesson = relationship("TeacherLesson", back_populates="students")
    student = relationship("User", foreign_keys=[student_id])
