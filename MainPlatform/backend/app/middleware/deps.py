"""
RBAC Dependencies for MainPlatform
Permission-based access control
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.database.models import User, UserRole, AccountStatus, StudentProfile, TeacherProfile, TeacherStatus
from app.middleware.auth import get_current_user

# ============================================================
# BASE DEPENDENCIES
# ============================================================

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user account is active"""
    if current_user.status != AccountStatus.active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def require_verified_teacher(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """Ensure user is verified teacher"""
    if current_user.role != UserRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this resource"
        )
    
    teacher_profile = db.query(TeacherProfile).filter(
        TeacherProfile.user_id == current_user.id
    ).first()
    
    if not teacher_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found"
        )
    
    if teacher_profile.verification_status != TeacherStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher account is pending approval"
        )
    
    return current_user


# ============================================================
# ROLE-BASED DEPENDENCIES
# ============================================================

async def get_current_student(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require student role"""
    if current_user.role != UserRole.student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this resource"
        )
    return current_user


async def get_current_parent(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require parent role"""
    if current_user.role != UserRole.parent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents can access this resource"
        )
    return current_user


async def get_current_teacher(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require teacher role"""
    if current_user.role != UserRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this resource"
        )
    return current_user


async def get_current_organization(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require organization role"""
    if current_user.role != UserRole.organization:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizations can access this resource"
        )
    return current_user


async def get_current_moderator(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require moderator role"""
    if current_user.role != UserRole.moderator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only moderators can access this resource"
        )
    return current_user
