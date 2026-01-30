"""
RBAC Models - Role-Based Access Control for Alif24 Platform
Enhanced User, Profile, and Classroom models
"""
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, Date, Text, ForeignKey, Enum as SQLEnum, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
import secrets
import string
from app.core.database import Base


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, enum.Enum):
    """User roles in the system"""
    super_admin = "super_admin"
    admin = "admin"
    teacher = "teacher"
    parent = "parent"
    student = "student"


class AccountStatus(str, enum.Enum):
    """Account status"""
    pending = "pending"
    active = "active"
    suspended = "suspended"
    deleted = "deleted"


class TeacherStatus(str, enum.Enum):
    """Teacher verification status"""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ChildRelationship(str, enum.Enum):
    """Relationship type between parent and child"""
    mother = "mother"
    father = "father"
    grandmother = "grandmother"
    grandfather = "grandfather"
    guardian = "guardian"
    other = "other"


# ============================================================
# USER MODEL (Updated)
# ============================================================

class User(Base):
    """
    Main User model - base for all user types
    For children (4-7yo): email can be null, uses PIN-based auth
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Auth fields
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)  # Null for children
    
    # Child-specific auth (PIN-based)
    username = Column(String(50), unique=True, nullable=True, index=True)  # For child login
    pin_code = Column(String(6), nullable=True)  # 4-6 digit PIN for children
    parent_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Link to parent
    
    # Basic info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    avatar = Column(String(500), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    
    # Role and status
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.student)
    status = Column(SQLEnum(AccountStatus), default=AccountStatus.active)
    
    # Settings
    language = Column(String(5), default="uz")
    timezone = Column(String(50), default="Asia/Tashkent")
    
    # Timestamps
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships - foreign_keys aniq kiritildi chunki StudentProfile'da user_id va parent_user_id bor
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="StudentProfile.user_id")
    parent_profile = relationship("ParentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="ParentProfile.user_id")
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", foreign_keys="TeacherProfile.user_id")
    
    # Notifications relationship
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    # Parent-Child relationship
    children = relationship("User", backref="parent", remote_side=[id], foreign_keys=[parent_id])
    
    def __repr__(self):
        return f"<User {self.email or self.username} role={self.role.value}>"
    
    @staticmethod
    def generate_pin(length: int = 4) -> str:
        """Generate random PIN code for child"""
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    @staticmethod
    def generate_username(first_name: str) -> str:
        """Generate unique username for child"""
        random_suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
        return f"{first_name.lower()}{random_suffix}"
    
    def set_pin(self, pin: str):
        """Hash PIN using bcrypt"""
        import bcrypt
        salt = bcrypt.gensalt()
        self.pin_code = bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')
    
    def verify_pin(self, pin: str) -> bool:
        """Verify PIN using bcrypt"""
        if not self.pin_code:
            return False
        import bcrypt
        try:
            return bcrypt.checkpw(pin.encode('utf-8'), self.pin_code.encode('utf-8'))
        except Exception:
            # Fallback for old plain-text PINs if any (for migration period)
            return self.pin_code == pin
    
    def set_password(self, password: str):
        """Hash password using bcrypt"""
        import bcrypt
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str) -> bool:
        """Verify password using bcrypt"""
        if not self.password_hash:
            return False
        import bcrypt
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "role": self.role.value,
            "status": self.status.value,
            "avatar": self.avatar,
            "language": self.language,
            "parent_id": str(self.parent_id) if self.parent_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============================================================
# STUDENT PROFILE
# ============================================================

class StudentProfile(Base):
    """
    Student-specific profile for children (age 4-7)
    Linked to parent account
    """
    __tablename__ = "student_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Relationship to parent
    parent_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    relationship_type = Column(SQLEnum(ChildRelationship), default=ChildRelationship.guardian)
    
    # Education info
    grade = Column(String(20), nullable=True)
    school_name = Column(String(200), nullable=True)
    
    # Gamification
    level = Column(Integer, default=1)
    total_points = Column(Integer, default=0)
    total_coins = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    
    # Progress
    total_lessons_completed = Column(Integer, default=0)
    total_games_played = Column(Integer, default=0)
    total_time_spent = Column(Integer, default=0)  # in minutes
    average_score = Column(Float, default=0.0)  # Changed to Float for precision
    
    # Preferences and Meta
    favorite_subjects = Column(JSON, default=[])
    avatar_id = Column(UUID(as_uuid=True), nullable=True)
    preferences = Column(JSON, default={
        "favoriteSubjects": [],
        "learningStyle": "visual",
        "soundEnabled": True,
        "animationsEnabled": True
    })
    
    # Parental controls (inherited from parent)
    screen_time_limit = Column(Integer, default=60)  # minutes per day
    is_restricted = Column(Boolean, default=False)
    
    # Timestamps
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    parent_user = relationship("User", foreign_keys=[parent_user_id])
    classroom_enrollments = relationship("ClassroomStudent", back_populates="student", cascade="all, delete-orphan")
    # Active Relationships
    progress = relationship("Progress", back_populates="student", foreign_keys="Progress.student_id", cascade="all, delete-orphan")
    game_sessions = relationship("GameSession", back_populates="student", foreign_keys="GameSession.student_id", cascade="all, delete-orphan")
    achievements = relationship("StudentAchievement", back_populates="student", foreign_keys="StudentAchievement.student_id", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<StudentProfile user_id={self.user_id} level={self.level}>"


# ============================================================
# PARENT PROFILE
# ============================================================

class ParentProfile(Base):
    """
    Parent-specific profile
    Manages children accounts and subscriptions
    """
    __tablename__ = "parent_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Personal info
    occupation = Column(String(200), nullable=True)
    
    # Subscription
    subscription_plan = Column(String(50), default="free")  # free, basic, premium
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    max_children_allowed = Column(Integer, default=3)
    
    # Notification settings
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    weekly_report = Column(Boolean, default=True)
    achievement_alerts = Column(Boolean, default=True)
    notification_preferences = Column(JSON, default={
        "email": True,
        "push": True,
        "sms": False,
        "weeklyReport": True,
        "achievementAlerts": True
    })
    
    # Parental controls (global for all children)
    default_screen_time = Column(Integer, default=60)  # minutes
    content_filter_level = Column(String(20), default="strict")  # strict, moderate, off
    allowed_time_slots = Column(JSON, default={
        "weekdays": {"start": "15:00", "end": "19:00"},
        "weekends": {"start": "09:00", "end": "20:00"}
    })
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="parent_profile", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<ParentProfile user_id={self.user_id} plan={self.subscription_plan}>"


# ============================================================
# TEACHER PROFILE
# ============================================================

class TeacherProfile(Base):
    """
    Teacher-specific profile
    Content creators and classroom managers
    """
    __tablename__ = "teacher_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Verification
    verification_status = Column(SQLEnum(TeacherStatus), default=TeacherStatus.pending)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Professional info
    specialization = Column(String(200), nullable=True)
    qualification = Column(String(200), nullable=True)
    years_of_experience = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    subjects = Column(JSON, default=[])
    
    # Documents
    diploma_url = Column(String(500), nullable=True)
    certificate_urls = Column(JSON, default=[])
    
    # Statistics
    total_students = Column(Integer, default=0)
    total_classrooms = Column(Integer, default=0)
    total_lessons_created = Column(Integer, default=0)
    rating = Column(Float, default=0.0)  # Changed to Float for precision
    
    # Verification Meta
    verification_documents = Column(JSON, default=[])
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="teacher_profile", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
    classrooms = relationship("Classroom", back_populates="teacher", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<TeacherProfile user_id={self.user_id} status={self.verification_status.value}>"


# ============================================================
# CLASSROOM
# ============================================================

class Classroom(Base):
    """
    Classroom model - Teachers create, Students join
    """
    __tablename__ = "classrooms"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic info
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True)
    grade_level = Column(String(20), nullable=True)  # "1-sinf", "2-sinf", etc.
    
    # Owner
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False)
    
    # Join code
    join_code = Column(String(8), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    
    # Settings
    max_students = Column(Integer, default=30)
    allow_late_join = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    teacher = relationship("TeacherProfile", back_populates="classrooms")
    students = relationship("ClassroomStudent", back_populates="classroom", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Classroom {self.name} code={self.join_code}>"
    
    @staticmethod
    def generate_join_code(length: int = 6) -> str:
        """Generate unique join code"""
        chars = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(chars) for _ in range(length))


# ============================================================
# CLASSROOM-STUDENT (Junction Table)
# ============================================================

class ClassroomStudent(Base):
    """
    Junction table for Classroom-Student many-to-many relationship
    """
    __tablename__ = "classroom_students"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    classroom = relationship("Classroom", back_populates="students")
    student = relationship("StudentProfile", back_populates="classroom_enrollments")
    
    __table_args__ = (
        UniqueConstraint('classroom_id', 'student_id', name='uq_classroom_student'),
    )
    
    def __repr__(self):
        return f"<ClassroomStudent classroom={self.classroom_id} student={self.student_id}>"
