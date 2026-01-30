"""
Legacy User Model - Redirects to rbac_models

This file is kept for backward compatibility.
All user-related models are now in rbac_models.py
"""
import bcrypt
from app.core.database import Base

# Re-export from rbac_models for backward compatibility
from app.models.rbac_models import (
    User,
    UserRole,
    AccountStatus,
    StudentProfile,
    ParentProfile,
    TeacherProfile,
    TeacherStatus,
    ChildRelationship,
    Classroom,
    ClassroomStudent
)

# Language enum (not in rbac_models)
import enum

class Language(str, enum.Enum):
    uz = "uz"
    ru = "ru"


# Password utility functions for backward compatibility
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password using bcrypt"""
    password_bytes = password.encode('utf-8')[:72]
    return bcrypt.checkpw(password_bytes, password_hash.encode('utf-8'))


# Extend User class with password methods if not already present
if not hasattr(User, 'set_password'):
    def set_password(self, password: str):
        """Hash password using bcrypt"""
        self.password_hash = hash_password(password)
    
    def verify_password(self, password: str) -> bool:
        """Verify password using bcrypt"""
        if not self.password_hash:
            return False
        return verify_password(password, self.password_hash)
    
    User.set_password = set_password
    User.verify_password = verify_password


__all__ = [
    "User",
    "UserRole",
    "Language",
    "AccountStatus",
    "StudentProfile",
    "ParentProfile", 
    "TeacherProfile",
    "TeacherStatus",
    "ChildRelationship",
    "Classroom",
    "ClassroomStudent",
    "hash_password",
    "verify_password",
]
