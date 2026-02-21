"""
Classroom Models - Sinf boshqaruv tizimi
O'qituvchi sinf yaratadi, o'quvchilarni taklif qiladi
"""
import enum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id
import secrets
import string


class ClassroomStudentStatus(str, enum.Enum):
    invited = "invited"      # Taklif yuborildi
    active = "active"        # Qabul qildi, faol
    removed = "removed"      # O'chirildi


class InvitationStatus(str, enum.Enum):
    pending = "pending"      # Kutilmoqda
    accepted = "accepted"    # Qabul qilindi
    declined = "declined"    # Rad etildi
    expired = "expired"      # Muddati o'tdi


class InvitationType(str, enum.Enum):
    phone = "phone"          # Telefon raqam orqali
    email = "email"          # Email orqali
    user_id = "user_id"      # User ID orqali


def generate_invite_code() -> str:
    """6 xonali unique taklif kodi"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(6))


class Classroom(Base):
    """
    Sinf modeli — O'qituvchi yaratadi
    """
    __tablename__ = "classrooms"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    teacher_id = Column(String(8), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=True)
    grade_level = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)

    invite_code = Column(String(6), unique=True, nullable=False, default=generate_invite_code)
    max_students = Column(Integer, default=40)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    teacher = relationship("TeacherProfile", backref="classrooms")
    students = relationship("ClassroomStudent", back_populates="classroom", cascade="all, delete-orphan")
    invitations = relationship("ClassroomInvitation", back_populates="classroom", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="classroom", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Classroom {self.name} teacher={self.teacher_id}>"


class ClassroomStudent(Base):
    """
    Sinf-O'quvchi bog'lanishi
    """
    __tablename__ = "classroom_students"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    classroom_id = Column(String(8), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    student_user_id = Column(String(8), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    status = Column(SQLEnum(ClassroomStudentStatus), default=ClassroomStudentStatus.active)

    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    removed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    classroom = relationship("Classroom", back_populates="students")
    student = relationship("User", foreign_keys=[student_user_id])

    def __repr__(self):
        return f"<ClassroomStudent classroom={self.classroom_id} student={self.student_user_id}>"


class ClassroomInvitation(Base):
    """
    Sinf taklifi — phone/email/user_id orqali yuboriladi
    O'quvchiga Telegram bot va in-app notification keladi
    """
    __tablename__ = "classroom_invitations"

    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    classroom_id = Column(String(8), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    invited_by = Column(String(8), ForeignKey("users.id"), nullable=False)

    # Taklif qilingan o'quvchi identifikatori
    invitation_type = Column(SQLEnum(InvitationType), nullable=False)
    identifier = Column(String(255), nullable=False)  # phone, email yoki user_id

    # Agar user topilsa, bog'lanadi
    student_user_id = Column(String(8), ForeignKey("users.id"), nullable=True)

    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.pending)
    message = Column(Text, nullable=True)  # O'qituvchi xabari

    expires_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    classroom = relationship("Classroom", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[invited_by])
    student = relationship("User", foreign_keys=[student_user_id])

    def __repr__(self):
        return f"<ClassroomInvitation {self.invitation_type.value}:{self.identifier} status={self.status.value}>"


__all__ = [
    "Classroom",
    "ClassroomStudent",
    "ClassroomInvitation",
    "ClassroomStudentStatus",
    "InvitationStatus",
    "InvitationType",
]
