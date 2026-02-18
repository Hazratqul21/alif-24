"""
Auth Router - MainPlatform
Authentication endpoints using shared modules
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime, timezone

from shared.database import get_db
from shared.database.models import User
from shared.auth import create_access_token, create_refresh_token
from ...middleware.auth import get_current_user
from ...services.auth_service import AuthService
from ...schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from ...schemas.rbac import ChildLoginRequest

router = APIRouter()

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")
    
    class Config:
        populate_by_name = True

class UpdateProfileRequest(BaseModel):
    """Schema for profile updates via PUT /auth/me"""
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    
    class Config:
        populate_by_name = True

@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register new user"""
    data.validate()
    service = AuthService(db)
    result = await service.register(data)
    return {
        "success": True,
        "message": "Registration successful",
        "data": result
    }

@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login user"""
    service = AuthService(db)
    result = await service.login(data.email, data.password)
    return {
        "success": True,
        "message": "Login successful",
        "data": result
    }

@router.post("/refresh")
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    service = AuthService(db)
    result = await service.refresh_token(data.refresh_token)
    return {
        "success": True,
        "message": "Token refreshed",
        "data": result
    }

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user"""
    service = AuthService(db)
    await service.logout(current_user.id)
    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.put("/password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change password"""
    service = AuthService(db)
    await service.change_password(
        current_user.id,
        data.current_password,
        data.new_password
    )
    return {
        "success": True,
        "message": "Password changed successfully"
    }

@router.post("/child-login")
async def child_login(
    request: ChildLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login for child accounts using username + PIN"""
    from ...repositories.user_repository import UserRepository
    from ...core.errors import UnauthorizedError
    from sqlalchemy import select
    
    user_repo = UserRepository(db)
    child = await user_repo.find_by_username(request.username)
    
    if not child or not child.verify_pin(request.pin):
        raise UnauthorizedError("Invalid username or PIN")
    
    # Update last login
    child.last_login_at = datetime.now(timezone.utc)
    
    # Generate tokens
    access_token = create_access_token(
        data={
            "sub": child.id,
            "email": child.username,
            "role": child.role.value
        }
    )
    refresh_token = create_refresh_token(data={"sub": child.id})
    
    # Save refresh token
    child.refresh_token = refresh_token
    await db.commit()
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": child.to_dict(),
            "parent_id": child.parent_id
        }
    }

@router.post("/avatar")
async def upload_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload user avatar (placeholder)"""
    return {
        "success": True,
        "message": "Avatar upload endpoint ready. Connect storage service for file handling.",
        "data": {"avatar": current_user.avatar}
    }

@router.get("/me")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile"""
    service = AuthService(db)
    profile = await service.get_profile(current_user.id)
    return {
        "success": True,
        "data": profile
    }

@router.put("/me")
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    service = AuthService(db)
    updates = data.model_dump(exclude_none=True, by_alias=False)
    profile = await service.update_profile(current_user.id, updates)
    return {
        "success": True,
        "message": "Profile updated successfully",
        "data": profile
    }


# ============================================================
# PARENT → BOLA BOSHQARISH
# ============================================================

class AddChildRequest(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    date_of_birth: Optional[str] = None  # "YYYY-MM-DD"
    gender: Optional[str] = None  # "male" | "female"
    grade: Optional[str] = None

@router.post("/children")
async def add_child(
    data: AddChildRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-ona o'z bolasini qo'shish (username + PIN yaratiladi)"""
    from shared.database.models import UserRole, StudentProfile, Gender
    from datetime import date as date_type

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-ona bola qo'sha oladi")

    # Username va PIN yaratish
    username = User.generate_username(data.first_name)
    pin = User.generate_pin(4)

    child = User(
        first_name=data.first_name,
        last_name=data.last_name or current_user.last_name,
        username=username,
        role=UserRole.student,
        parent_id=current_user.id,
    )
    child.set_pin(pin)

    # Qo'shimcha maydonlar
    if data.date_of_birth:
        try:
            child.date_of_birth = date_type.fromisoformat(data.date_of_birth)
        except (ValueError, TypeError):
            pass
    if data.gender:
        try:
            child.gender = Gender(data.gender)
        except (ValueError, KeyError):
            pass

    db.add(child)
    await db.flush()

    # Student profile yaratish
    student = StudentProfile(user_id=child.id)
    if data.grade:
        student.grade = data.grade
    db.add(student)
    await db.commit()

    return {
        "success": True,
        "message": "Bola muvaffaqiyatli qo'shildi",
        "data": {
            "child": child.to_dict(),
            "username": username,
            "pin": pin,  # Faqat yaratilganda bir marta ko'rsatiladi
        }
    }


@router.get("/children")
async def list_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-onaning bolalari ro'yxati"""
    from sqlalchemy import select
    from shared.database.models import UserRole

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-ona bolalarni ko'ra oladi")

    result = await db.execute(
        select(User).where(User.parent_id == current_user.id)
    )
    children = result.scalars().all()

    return {
        "success": True,
        "data": [child.to_dict() for child in children]
    }
