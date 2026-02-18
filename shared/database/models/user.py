"""
User Model - Asosiy foydalanuvchi modeli
Barcha platformalar uchun umumiy
"""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import secrets
import string
from shared.database.base import Base
from shared.database.id_generator import generate_8_digit_id, generate_pin, generate_username


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, enum.Enum):
    """Foydalanuvchi rollari"""
    moderator = "moderator"        # Platform rahbarlari (CEO, CTO, metodist)
    organization = "organization"   # Ta'lim tashkiloti
    teacher = "teacher"            # O'qituvchi
    parent = "parent"              # Ota-ona
    student = "student"            # O'quvchi


class ModeratorRoleType(str, enum.Enum):
    """Moderator sub-rollari"""
    ceo = "ceo"              # Bosh direktor
    cto = "cto"              # Texnik direktor
    methodist = "methodist"  # Metodist


class AccountStatus(str, enum.Enum):
    """Akkaunt holati"""
    pending = "pending"      # Kutilmoqda
    active = "active"        # Faol
    suspended = "suspended"  # To'xtatilgan
    deleted = "deleted"      # O'chirilgan


class TeacherStatus(str, enum.Enum):
    """O'qituvchi tekshiruv holati"""
    pending = "pending"      # Kutilmoqda
    approved = "approved"    # Tasdiqlangan
    rejected = "rejected"    # Rad etilgan


class ChildRelationship(str, enum.Enum):
    """Ota-ona va bola o'rtasida munosabat"""
    mother = "mother"
    father = "father"
    grandmother = "grandmother"
    grandfather = "grandfather"
    guardian = "guardian"
    other = "other"


class Gender(str, enum.Enum):
    """Jins"""
    male = "male"
    female = "female"


class Language(str, enum.Enum):
    """Platform tillari"""
    uz = "uz"  # O'zbek
    ru = "ru"  # Rus


# ============================================================
# USER MODEL
# ============================================================

class User(Base):
    """
    Asosiy User model - Barcha foydalanuvchilar uchun
    4-7 yoshli bolalar uchun: email null bo'lishi mumkin, PIN bilan kirish
    """
    __tablename__ = "users"
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)
    
    # Autentifikatsiya
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)  # Bolalar uchun null
    
    # Bolalar uchun (PIN-based auth)
    username = Column(String(50), unique=True, nullable=True, index=True)
    pin_code = Column(String(6), nullable=True)  # 4-6 raqamli PIN
    parent_id = Column(String(8), ForeignKey("users.id"), nullable=True)
    
    # Asosiy ma'lumotlar
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    avatar = Column(String(500), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(SQLEnum(Gender), nullable=True)
    
    # Rol va status
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.student)
    status = Column(SQLEnum(AccountStatus), default=AccountStatus.active)
    
    # Token saqlash
    refresh_token = Column(Text, nullable=True)
    
    # Sozlamalar
    language = Column(String(5), default="uz")
    timezone = Column(String(50), default="Asia/Tashkent")
    
    # Vaqt tamg'alari
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="StudentProfile.user_id")
    parent_profile = relationship("ParentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="ParentProfile.user_id")
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="TeacherProfile.user_id")
    moderator_profile = relationship("ModeratorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="ModeratorProfile.user_id")
    organization_profile = relationship("OrganizationProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="OrganizationProfile.user_id")
    
    # Ota-ona-Bola munosabati
    children = relationship("User", backref="parent", remote_side=[id], foreign_keys=[parent_id])
    
    def __repr__(self):
        return f"<User {self.email or self.username} role={self.role.value}>"
    
    @staticmethod
    def generate_pin(length: int = 4) -> str:
        """Bola uchun tasodifiy PIN yaratish"""
        return generate_pin(length)
    
    @staticmethod
    def generate_username(first_name: str) -> str:
        """Bola uchun unique username yaratish"""
        return generate_username(first_name)
    
    def set_pin(self, pin: str):
        """PIN'ni hash qilish (bcrypt)"""
        import bcrypt
        salt = bcrypt.gensalt()
        self.pin_code = bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')
    
    def verify_pin(self, pin: str) -> bool:
        """PIN'ni tekshirish"""
        if not self.pin_code:
            return False
        import bcrypt
        try:
            # pin_code hash bo'lishi kerak
            return bcrypt.checkpw(pin.encode('utf-8'), self.pin_code.encode('utf-8'))
        except Exception:
            # Xavfsizlik uchun plaintext fallback olib tashlandi
            return False
    
    def set_password(self, password: str):
        """Parolni hash qilish (bcrypt)"""
        import bcrypt
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str) -> bool:
        """Parolni tekshirish"""
        if not self.password_hash:
            return False
        import bcrypt
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self) -> dict:
        """Dict formatga aylantirish"""
        return {
            "id": self.id,
            "email": self.email,
            "phone": self.phone,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role.value,
            "status": self.status.value,
            "avatar": self.avatar,
            "language": self.language,
            "parent_id": self.parent_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


__all__ = [
    "User",
    "UserRole",
    "ModeratorRoleType",
    "AccountStatus",
    "TeacherStatus",
    "ChildRelationship",
    "Language"
]
