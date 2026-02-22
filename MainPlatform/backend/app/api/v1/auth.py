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
# PARENT → BOLA BOSHQARISH (Search + Invite tizimi)
# Ota-ona bolani ID / email / telefon orqali qidiradi,
# taklif yuboradi, bola qabul qiladi — xuddi sinfga qo'shilish kabi.
# ============================================================

from shared.database.models.in_app_notification import InAppNotification, InAppNotifType

class ChildSearchRequest(BaseModel):
    query: str  # ID, email yoki telefon raqam

class ChildInviteRequest(BaseModel):
    student_id: str  # Topilgan o'quvchining user ID si


@router.post("/children/search")
async def search_child(
    data: ChildSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bolani ID, email yoki telefon raqami orqali qidirish"""
    from shared.database.models import UserRole
    from sqlalchemy import select, or_

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    q = data.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Qidiruv so'zini kiriting")

    result = await db.execute(
        select(User).where(
            User.role == UserRole.student,
            or_(
                User.id == q,
                User.email == q,
                User.phone == q,
                User.username == q,
            )
        )
    )
    student = result.scalar_one_or_none()

    if not student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi. ID, email yoki telefon raqamini tekshiring.")

    if student.parent_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bu farzand allaqachon sizga biriktirilgan")

    if student.parent_id:
        raise HTTPException(status_code=400, detail="Bu o'quvchining ota-onasi allaqachon mavjud")

    return {
        "success": True,
        "data": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "avatar": student.avatar,
            "username": student.username,
        }
    }


@router.post("/children/invite")
async def invite_child(
    data: ChildInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """O'quvchiga ota-ona sifatida taklif yuborish"""
    from shared.database.models import UserRole
    from sqlalchemy import select, and_

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    # O'quvchini tekshirish
    result = await db.execute(
        select(User).where(User.id == data.student_id, User.role == UserRole.student)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    if student.parent_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bu farzand allaqachon sizga biriktirilgan")

    if student.parent_id:
        raise HTTPException(status_code=400, detail="Bu o'quvchining ota-onasi allaqachon mavjud")

    # Avvalgi kutilayotgan taklif bormi tekshirish
    existing = await db.execute(
        select(InAppNotification).where(
            InAppNotification.user_id == student.id,
            InAppNotification.sender_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
            InAppNotification.is_read == False,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Taklif allaqachon yuborilgan. Farzandingiz javob berishini kuting.")

    # Notification yaratish — bolaga habar boradi
    notif = InAppNotification(
        user_id=student.id,
        sender_id=current_user.id,
        title="Ota-ona taklifi",
        message=f"{current_user.first_name} {current_user.last_name} sizni farzandi sifatida qo'shmoqchi. Qabul qilasizmi?",
        notif_type=InAppNotifType.parent_invite,
        reference_type="parent_invite",
        reference_id=current_user.id,
    )
    db.add(notif)
    await db.commit()

    return {
        "success": True,
        "message": f"Taklif {student.first_name} ga yuborildi. U saytdan qabul qilishi kerak.",
    }


@router.get("/children/pending")
async def list_pending_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-onaning kutilayotgan taklif ro'yxati"""
    from shared.database.models import UserRole
    from sqlalchemy import select

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    result = await db.execute(
        select(InAppNotification).where(
            InAppNotification.sender_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
            InAppNotification.is_read == False,
        )
    )
    invites = result.scalars().all()

    pending = []
    for inv in invites:
        stu = await db.execute(select(User).where(User.id == inv.user_id))
        stu = stu.scalar_one_or_none()
        if stu:
            pending.append({
                "invite_id": inv.id,
                "student_id": stu.id,
                "first_name": stu.first_name,
                "last_name": stu.last_name,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            })

    return {"success": True, "data": pending}


@router.get("/children")
async def list_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ota-onaning biriktirilgan bolalari ro'yxati"""
    from sqlalchemy import select
    from shared.database.models import UserRole

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")
        
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).options(selectinload(User.student_profile)).where(User.parent_id == current_user.id)
    )
    children = result.scalars().all()
    
    data = []
    for child in children:
        c_dict = child.to_dict()
        if child.student_profile:
            c_dict["stats"] = {
                "level": child.student_profile.level,
                "total_points": child.student_profile.total_points,
                "total_coins": child.student_profile.total_coins,
                "current_streak": child.student_profile.current_streak,
            }
        data.append(c_dict)

    return {
        "success": True,
        "data": data
    }

@router.get("/children/{child_id}")
async def get_child_details(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")
        
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User).options(selectinload(User.student_profile)).where(User.id == child_id, User.parent_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Bola topilmadi")
        
    c_dict = child.to_dict()
    if child.student_profile:
        c_dict["stats"] = {
            "level": child.student_profile.level,
            "total_points": child.student_profile.total_points,
            "total_coins": child.student_profile.total_coins,
            "current_streak": child.student_profile.current_streak,
            "total_lessons": child.student_profile.total_lessons_completed,
            "average_score": child.student_profile.average_score
        }
    return {"success": True, "data": c_dict}


@router.post("/children/{child_id}/regenerate-pin")
async def regenerate_child_pin(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bola uchun yangi PIN yaratish"""
    from shared.database.models import UserRole

    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun ruxsat etilgan")

    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(User).where(User.id == child_id, User.parent_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Bola topilmadi")

    new_pin = User.generate_pin(4)
    child.set_pin(new_pin)
    await db.commit()

    return {
        "success": True,
        "data": {
            "username": child.username,
            "new_pin": new_pin,
        },
        "message": "PIN muvaffaqiyatli yangilandi"
    }


# ============================================================
# O'QUVCHI: Ota-ona taklifini qabul / rad etish
# ============================================================

@router.post("/parent-invites/{notif_id}/accept")
async def accept_parent_invite(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """O'quvchi ota-ona taklifini qabul qiladi"""
    from sqlalchemy import select

    notif = await db.execute(
        select(InAppNotification).where(
            InAppNotification.id == notif_id,
            InAppNotification.user_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
        )
    )
    notif = notif.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")

    if notif.is_read:
        raise HTTPException(status_code=400, detail="Bu taklifga allaqachon javob berilgan")

    if current_user.parent_id:
        raise HTTPException(status_code=400, detail="Sizning ota-onangiz allaqachon mavjud")

    parent_id = notif.sender_id

    # Parent mavjudligini tekshirish
    parent = await db.execute(select(User).where(User.id == parent_id))
    parent = parent.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Ota-ona topilmadi")

    # Bolani ota-onaga biriktirish
    current_user.parent_id = parent_id

    # StudentProfile.parent_user_id ham yangilash
    from shared.database.models import StudentProfile
    sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    sp = sp_res.scalar_one_or_none()
    if sp:
        sp.parent_user_id = parent_id

    # Taklifni yopish
    notif.is_read = True
    from datetime import datetime, timezone
    notif.read_at = datetime.now(timezone.utc)

    # Ota-onaga habar yuborish
    confirm_notif = InAppNotification(
        user_id=parent_id,
        sender_id=current_user.id,
        title="Farzand qo'shildi!",
        message=f"{current_user.first_name} {current_user.last_name} sizning taklifingizni qabul qildi.",
        notif_type=InAppNotifType.system,
        reference_type="parent_accept",
        reference_id=current_user.id,
    )
    db.add(confirm_notif)
    await db.commit()

    return {
        "success": True,
        "message": f"Siz {parent.first_name} {parent.last_name} ga farzand sifatida birikdingiz."
    }


@router.post("/parent-invites/{notif_id}/decline")
async def decline_parent_invite(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """O'quvchi ota-ona taklifini rad etadi"""
    from sqlalchemy import select

    notif = await db.execute(
        select(InAppNotification).where(
            InAppNotification.id == notif_id,
            InAppNotification.user_id == current_user.id,
            InAppNotification.notif_type == InAppNotifType.parent_invite,
        )
    )
    notif = notif.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")

    if notif.is_read:
        raise HTTPException(status_code=400, detail="Bu taklifga allaqachon javob berilgan")

    # Taklifni yopish
    notif.is_read = True
    from datetime import datetime, timezone
    notif.read_at = datetime.now(timezone.utc)

    # Ota-onaga habar
    parent_id = notif.sender_id
    decline_notif = InAppNotification(
        user_id=parent_id,
        sender_id=current_user.id,
        title="Taklif rad etildi",
        message=f"{current_user.first_name} {current_user.last_name} taklifingizni rad etdi.",
        notif_type=InAppNotifType.system,
        reference_type="parent_decline",
        reference_id=current_user.id,
    )
    db.add(decline_notif)
    await db.commit()

    return {
        "success": True,
        "message": "Taklif rad etildi."
    }
