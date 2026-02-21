"""
Assignment Models - Vazifa tizimi
O'qituvchi/ota-ona/admin vazifa beradi, o'quvchi topshiradi
"""
import enum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Float, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id


class AssignmentType(str, enum.Enum):
    homework = "homework"        # Uy vazifasi
    test = "test"                # Test (TestAI bilan)
    reading = "reading"          # O'qish (darslik/ertak)
    material = "material"        # Material ko'rish
    project = "project"          # Loyiha


class AssignmentTargetType(str, enum.Enum):
    classroom = "classroom"      # Butun sinfga
    student = "student"          # Bitta o'quvchiga


class SubmissionStatus(str, enum.Enum):
    pending = "pending"          # Topshirilmagan
    submitted = "submitted"      # Topshirildi
    graded = "graded"            # Baholandi
    late = "late"                # Kech topshirildi
    missed = "missed"            # O'tkazib yuborildi


class AssignmentCreatorRole(str, enum.Enum):
    teacher = "teacher"
    parent = "parent"
    admin = "admin"
    organization = "organization"


class Assignment(Base):
    """
    Vazifa modeli
    O'qituvchi, ota-ona yoki admin tomonidan yaratiladi
    """
    __tablename__ = "assignments"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)

    # Kim yaratdi
    created_by = Column(String(8), ForeignKey("users.id"), nullable=False)
    creator_role = Column(SQLEnum(AssignmentCreatorRole), nullable=False, default=AssignmentCreatorRole.teacher)

    # Qaysi sinfga (agar classroom assignment bo'lsa)
    classroom_id = Column(String(8), ForeignKey("classrooms.id", ondelete="SET NULL"), nullable=True)

    # Vazifa ma'lumotlari
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    assignment_type = Column(SQLEnum(AssignmentType), default=AssignmentType.homework)

    # Kontent (matn, link, yoki reference)
    content = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)   # [{"name": "file.pdf", "url": "...", "type": "pdf"}]
    reference_id = Column(String(8), nullable=True)    # lesson_id, test_id, ertak_id
    reference_type = Column(String(50), nullable=True) # "lesson", "test", "ertak"

    # Sozlamalar
    max_score = Column(Integer, default=100)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_published = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    classroom = relationship("Classroom", back_populates="assignments")
    targets = relationship("AssignmentTarget", back_populates="assignment", cascade="all, delete-orphan")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Assignment {self.title} type={self.assignment_type.value}>"


class AssignmentTarget(Base):
    """
    Vazifa maqsadi — sinfga yoki bitta o'quvchiga
    """
    __tablename__ = "assignment_targets"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    assignment_id = Column(String(8), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)

    target_type = Column(SQLEnum(AssignmentTargetType), nullable=False)
    target_id = Column(String(8), nullable=False)  # classroom_id yoki student user_id

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assignment = relationship("Assignment", back_populates="targets")

    def __repr__(self):
        return f"<AssignmentTarget {self.target_type.value}:{self.target_id}>"


class AssignmentSubmission(Base):
    """
    O'quvchining vazifa topshiruvi
    """
    __tablename__ = "assignment_submissions"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    assignment_id = Column(String(8), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Topshiruv
    content = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)  # [{"name": "...", "url": "..."}]

    # Baholash
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.pending)

    # Vaqtlar
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    graded_at = Column(DateTime(timezone=True), nullable=True)
    graded_by = Column(String(8), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_user_id])
    grader = relationship("User", foreign_keys=[graded_by])

    def __repr__(self):
        return f"<AssignmentSubmission assignment={self.assignment_id} student={self.student_user_id} status={self.status.value}>"


__all__ = [
    "Assignment",
    "AssignmentTarget",
    "AssignmentSubmission",
    "AssignmentType",
    "AssignmentTargetType",
    "SubmissionStatus",
    "AssignmentCreatorRole",
]
