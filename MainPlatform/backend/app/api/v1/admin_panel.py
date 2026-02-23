"""
Admin Panel Router - /hazratqul, /nurali, /pedagog
Alif24 Platform Super Admin Endpoints

Rollar:
- /hazratqul: Super Admin (barcha huquqlar)
- /nurali: Super Admin (barcha huquqlar — hazratqul bilan bir xil)
- /pedagog: Teacher Admin (kontentlar, darslar, ertaklar)
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, text, select
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import httpx

from shared.database import get_db
from shared.database.models import (
    User, UserRole, AccountStatus, TeacherStatus,
    StudentProfile, TeacherProfile, ParentProfile,
    ModeratorProfile, OrganizationProfile,
    StudentCoin, CoinTransaction, TelegramUser,
    SubscriptionPlanConfig, UserSubscription, SubscriptionStatus,
)

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(tags=["admin"])

# Admin Secret Keys from environment
ADMIN_KEYS = {
    "hazratqul": "alif24_rahbariyat26!",
    "nurali": "alif24_rahbariyat26!",
    "pedagog": "alif24_rahbariyat26!",
}

# nurali = hazratqul (bir xil huquqlar)
ROLE_PERMISSIONS = {
    "hazratqul": ["all"],
    "nurali": ["all"],  # nurali endi super admin
    "pedagog": ["teachers", "students", "lessons", "content", "view"]
}

# Lessions backend URL for content management
LESSIONS_API = os.getenv("LESSIONS_API_URL", "http://localhost:8006/api/v1")


class AdminAuthError(HTTPException):
    def __init__(self):
        super().__init__(status_code=401, detail="Admin authentication failed")


async def verify_admin(
    x_admin_role: str = Header(..., alias="X-Admin-Role"),
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Verify admin credentials from headers
    X-Admin-Role: hazratqul | nurali | pedagog
    X-Admin-Key: respective secret key
    """
    role = x_admin_role.lower()
    
    if role not in ADMIN_KEYS:
        raise AdminAuthError()
    
    expected_key = ADMIN_KEYS.get(role)
    if not expected_key or x_admin_key != expected_key:
        raise AdminAuthError()
    
    return {"role": role, "permissions": ROLE_PERMISSIONS.get(role, [])}


def has_permission(admin: Dict, perm: str) -> bool:
    """Check if admin has specific permission"""
    return "all" in admin["permissions"] or perm in admin["permissions"]


# ============================================================================
# SCHEMAS (must be defined before endpoints that use them)
# ============================================================================

class AdminLoginRequest(BaseModel):
    role: str = Field(..., pattern="^(hazratqul|nurali|pedagog)$")
    password: str

class UserCreateRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    first_name: str
    last_name: str
    role: str = Field(default="student", pattern="^(student|teacher|parent|moderator|organization)$")
    password: Optional[str] = None

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None

class TeacherApprovalRequest(BaseModel):
    teacher_id: str
    status: str = Field(..., pattern="^(approved|rejected|pending)$")
    comment: Optional[str] = None

class LessonCreateRequest(BaseModel):
    title: str
    subject: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[str] = None
    language: str = "uz"
    video_url: Optional[str] = None
    attachments: Optional[Any] = None

class LessonUpdateRequest(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[str] = None
    language: Optional[str] = None
    video_url: Optional[str] = None
    attachments: Optional[Any] = None

class StoryCreateRequest(BaseModel):
    title: str
    content: str
    language: str = "uz"
    age_group: Optional[str] = None
    audio_url: Optional[str] = None

class StoryUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None
    age_group: Optional[str] = None
    audio_url: Optional[str] = None

class StatsResponse(BaseModel):
    total_users: int
    total_students: int
    total_teachers: int
    total_parents: int
    active_users: int
    coins_in_circulation: int


# ============================================================================
# DIRECT CONTENT MANAGEMENT - bypass Lessions API
# ============================================================================

from shared.database.models.lesson import Lesson
from shared.database.models.story import Story

@router.get("/direct/lessons")
async def list_direct_lessons(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    subject: Optional[str] = None,
    language: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List lessons directly from database (bypass Lessions API)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    stmt = select(Lesson).order_by(Lesson.created_at.desc())
    count_stmt = select(func.count(Lesson.id))
    
    if subject:
        stmt = stmt.where(Lesson.subject == subject)
        count_stmt = count_stmt.where(Lesson.subject == subject)
    
    if language:
        stmt = stmt.where(Lesson.language == language)
        count_stmt = count_stmt.where(Lesson.language == language)
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    lessons = result.scalars().all()
    
    return {
        "total": total,
        "lessons": [
            {
                "id": l.id,
                "title": l.title,
                "subject": l.subject,
                "grade_level": l.grade_level,
                "language": l.language,
                "video_url": l.video_url,
                "attachments": l.attachments,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "updated_at": l.updated_at.isoformat() if l.updated_at else None,
            }
            for l in lessons
        ]
    }


@router.get("/direct/lessons/{lesson_id}")
async def get_direct_lesson(
    lesson_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get lesson details directly"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    
    return {
        "id": lesson.id,
        "title": lesson.title,
        "subject": lesson.subject,
        "content": lesson.content,
        "grade_level": lesson.grade_level,
        "language": lesson.language,
        "video_url": lesson.video_url,
        "attachments": lesson.attachments,
        "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
        "updated_at": lesson.updated_at.isoformat() if lesson.updated_at else None,
    }


@router.post("/direct/lessons")
async def create_direct_lesson(
    data: LessonCreateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create lesson directly in database"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    lesson = Lesson(
        title=data.title,
        subject=data.subject,
        content=data.content,
        grade_level=data.grade_level,
        language=data.language,
        video_url=data.video_url,
        attachments=data.attachments,
    )
    
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    
    return {
        "message": "Dars muvaffaqiyatli yaratildi",
        "lesson_id": lesson.id,
        "title": lesson.title,
    }


@router.put("/direct/lessons/{lesson_id}")
async def update_direct_lesson(
    lesson_id: str,
    data: LessonUpdateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update lesson directly"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    
    if data.title is not None:
        lesson.title = data.title
    if data.subject is not None:
        lesson.subject = data.subject
    if data.content is not None:
        lesson.content = data.content
    if data.grade_level is not None:
        lesson.grade_level = data.grade_level
    if data.language is not None:
        lesson.language = data.language
    if data.video_url is not None:
        lesson.video_url = data.video_url
    if data.attachments is not None:
        lesson.attachments = data.attachments
    
    lesson.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Dars yangilandi", "lesson_id": lesson_id}


@router.delete("/direct/lessons/{lesson_id}")
async def delete_direct_lesson(
    lesson_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete lesson directly"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    
    await db.delete(lesson)
    await db.commit()
    
    return {"message": "Dars o'chirildi", "lesson_id": lesson_id}


# ============================================================================
# DIRECT STORIES (ERTAKLAR) MANAGEMENT
# ============================================================================

@router.get("/direct/stories")
async def list_direct_stories(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    language: Optional[str] = None,
    age_group: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List stories directly from database"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    stmt = select(Story).order_by(Story.created_at.desc())
    count_stmt = select(func.count(Story.id))
    
    if language:
        stmt = stmt.where(Story.language == language)
        count_stmt = count_stmt.where(Story.language == language)
    
    if age_group:
        stmt = stmt.where(Story.age_group == age_group)
        count_stmt = count_stmt.where(Story.age_group == age_group)
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    stories = result.scalars().all()
    
    return {
        "total": total,
        "stories": [
            {
                "id": s.id,
                "title": s.title,
                "language": s.language,
                "age_group": s.age_group,
                "audio_url": s.audio_url,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in stories
        ]
    }


@router.post("/direct/stories")
async def create_direct_story(
    data: StoryCreateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create story directly"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    story = Story(
        title=data.title,
        content=data.content,
        language=data.language,
        age_group=data.age_group,
        audio_url=data.audio_url,
    )
    
    db.add(story)
    await db.commit()
    await db.refresh(story)
    
    return {
        "message": "Ertak muvaffaqiyatli yaratildi",
        "story_id": story.id,
        "title": story.title,
    }


@router.put("/direct/stories/{story_id}")
async def update_direct_story(
    story_id: str,
    data: StoryUpdateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update story directly"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    
    if data.title is not None:
        story.title = data.title
    if data.content is not None:
        story.content = data.content
    if data.language is not None:
        story.language = data.language
    if data.age_group is not None:
        story.age_group = data.age_group
    if data.audio_url is not None:
        story.audio_url = data.audio_url
    
    await db.commit()
    
    return {"message": "Ertak yangilandi", "story_id": story_id}


@router.delete("/direct/stories/{story_id}")
async def delete_direct_story(
    story_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete story directly"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    
    await db.delete(story)
    await db.commit()
    
    return {"message": "Ertak o'chirildi", "story_id": story_id}




# ============================================================================
# ADMIN LOGIN
# ============================================================================

@router.post("/login")
async def admin_login(data: AdminLoginRequest):
    """
    Admin login - parolni tekshiradi, role + key qaytaradi
    Frontend uchun: localStorage'ga saqlash kerak
    """
    role = data.role.lower()
    
    if role not in ADMIN_KEYS:
        raise HTTPException(status_code=401, detail="Noto'g'ri rol")
    
    expected_key = ADMIN_KEYS.get(role)
    if not expected_key or data.password != expected_key:
        raise HTTPException(status_code=401, detail="Parol noto'g'ri")
    
    return {
        "success": True,
        "role": role,
        "key": expected_key,
        "permissions": ROLE_PERMISSIONS.get(role, []),
        "message": f"Xush kelibsiz, {role}!"
    }


# ============================================================================
# DASHBOARD
# ============================================================================

@router.get("/dashboard")
async def admin_dashboard(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin Dashboard Statistics"""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_students = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.student))).scalar() or 0
    total_teachers = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.teacher))).scalar() or 0
    total_parents = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.parent))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.status == AccountStatus.active))).scalar() or 0
    
    coins_result = (await db.execute(select(func.sum(StudentCoin.current_balance)))).scalar()
    coins_in_circulation = int(coins_result) if coins_result else 0
    
    # Pending teachers count
    pending_teachers = 0
    try:
        pending_teachers = (await db.execute(
            select(func.count(TeacherProfile.id)).where(
                TeacherProfile.verification_status == TeacherStatus.pending
            )
        )).scalar() or 0
    except Exception:
        pass
    
    return {
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_parents": total_parents,
        "active_users": active_users,
        "coins_in_circulation": coins_in_circulation,
        "pending_teachers": pending_teachers,
        "admin_role": admin["role"]
    }


# ============================================================================
# USERS MANAGEMENT (CRUD)
# ============================================================================

@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List users with filters"""
    stmt = select(User).order_by(User.created_at.desc())
    count_stmt = select(func.count(User.id))
    
    if role:
        try:
            user_role = UserRole(role.lower())
            stmt = stmt.where(User.role == user_role)
            count_stmt = count_stmt.where(User.role == user_role)
        except ValueError:
            pass
    
    if status:
        try:
            account_status = AccountStatus(status.lower())
            stmt = stmt.where(User.status == account_status)
            count_stmt = count_stmt.where(User.status == account_status)
        except ValueError:
            pass
    
    if search:
        search_filter = f"%{search}%"
        search_cond = (
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (User.phone.ilike(search_filter))
        )
        stmt = stmt.where(search_cond)
        count_stmt = count_stmt.where(search_cond)
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    users = result.scalars().all()
    
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "phone": u.phone,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role.value if u.role else None,
                "status": u.status.value if u.status else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in users
        ]
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed user information"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get role-specific profile
    profile_data = None
    if user.role == UserRole.student:
        res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
        p = res.scalar_one_or_none()
        if p:
            profile_data = {
                "grade": getattr(p, 'grade', None),
                "school": getattr(p, 'school_name', None),
            }
    elif user.role == UserRole.teacher:
        res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == user_id))
        p = res.scalar_one_or_none()
        if p:
            profile_data = {
                "subject": getattr(p, 'subject', None),
                "school": getattr(p, 'school_name', None),
                "verification_status": p.verification_status.value if p.verification_status else None,
            }
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value if user.role else None,
            "status": user.status.value if user.status else None,
            "language": user.language,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        },
        "profile": profile_data
    }


@router.post("/users")
async def create_user(
    data: UserCreateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user (admin only)"""
    if not has_permission(admin, "users"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    # Check duplicate email
    if data.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu email allaqachon mavjud")
    
    # Check duplicate phone
    if data.phone:
        existing = await db.execute(select(User).where(User.phone == data.phone))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon mavjud")
    
    user = User(
        email=data.email,
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole(data.role),
        status=AccountStatus.active,
    )
    
    if data.password:
        user.set_password(data.password)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return {"message": "Foydalanuvchi yaratildi", "user_id": user.id}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    data: UserUpdateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user information"""
    if not has_permission(admin, "users"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if data.first_name:
        user.first_name = data.first_name
    if data.last_name:
        user.last_name = data.last_name
    if data.phone is not None:
        user.phone = data.phone
    if data.email is not None:
        user.email = data.email
    if data.status:
        try:
            user.status = AccountStatus(data.status.lower())
        except ValueError:
            pass
    if data.role:
        try:
            user.role = UserRole(data.role.lower())
        except ValueError:
            pass
    
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Foydalanuvchi yangilandi", "user_id": user_id}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete user (soft delete)"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin o'chira oladi")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Telegram linkni ham tozalash
    tg_res = await db.execute(select(TelegramUser).where(TelegramUser.user_id == user_id))
    tg_user = tg_res.scalar_one_or_none()
    telegram_unlinked = False
    if tg_user:
        tg_user.user_id = None
        telegram_unlinked = True

    user.status = AccountStatus.deleted
    user.deleted_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {
        "message": "Foydalanuvchi o'chirildi" + (" (Telegram ham uzildi)" if telegram_unlinked else ""),
        "user_id": user_id,
        "telegram_unlinked": telegram_unlinked,
    }


# ============================================================================
# TEACHER MANAGEMENT
# ============================================================================

@router.get("/teachers/pending")
async def list_pending_teachers(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List teachers waiting for approval"""
    if not has_permission(admin, "teachers") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    res = await db.execute(
        select(TeacherProfile).where(TeacherProfile.verification_status == TeacherStatus.pending)
    )
    pending = res.scalars().all()
    
    result = []
    for tp in pending:
        user_res = await db.execute(select(User).where(User.id == tp.user_id))
        user = user_res.scalar_one_or_none()
        if user:
            result.append({
                "user_id": user.id,
                "email": user.email,
                "phone": user.phone,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "status": tp.verification_status.value,
                "created_at": user.created_at.isoformat() if user.created_at else None
            })
    
    return {"count": len(result), "teachers": result}


@router.post("/teachers/approve")
async def approve_teacher(
    data: TeacherApprovalRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Approve or reject teacher"""
    if not has_permission(admin, "teachers") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    res = await db.execute(
        select(TeacherProfile).where(TeacherProfile.user_id == data.teacher_id)
    )
    teacher_profile = res.scalar_one_or_none()
    
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="O'qituvchi profili topilmadi")
    
    if data.status == "approved":
        teacher_profile.verification_status = TeacherStatus.approved
    elif data.status == "rejected":
        teacher_profile.verification_status = TeacherStatus.rejected
    else:
        teacher_profile.verification_status = TeacherStatus.pending
    
    teacher_profile.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    user_res = await db.execute(select(User).where(User.id == data.teacher_id))
    user = user_res.scalar_one_or_none()
    
    return {
        "message": f"O'qituvchi statusi: {data.status}",
        "teacher_id": data.teacher_id,
        "teacher_name": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else None
    }


# ============================================================================
# DATABASE MANAGEMENT - hazratqul & nurali
# ============================================================================

@router.get("/db/tables")
async def list_database_tables(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all database tables"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    result = await db.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """))
    
    tables = [row[0] for row in result]
    
    # Get row counts for each table
    table_info = []
    for t in tables:
        try:
            count_result = await db.execute(text(f'SELECT COUNT(*) FROM "{t}"'))
            count = count_result.scalar() or 0
            table_info.append({"name": t, "rows": count})
        except Exception:
            table_info.append({"name": t, "rows": 0})
    
    return {"tables": table_info}


@router.get("/db/tables/{table_name}")
async def get_table_data(
    table_name: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """View table data"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    try:
        # Get columns
        col_result = await db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = :tbl
            ORDER BY ordinal_position
        """), {"tbl": table_name})
        columns = [{"name": row[0], "type": row[1]} for row in col_result]
        
        if not columns:
            raise HTTPException(status_code=404, detail="Jadval topilmadi")
        
        count_result = await db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
        total = count_result.scalar()
        
        result = await db.execute(
            text(f'SELECT * FROM "{table_name}" ORDER BY 1 DESC LIMIT :lim OFFSET :off'),
            {"lim": limit, "off": offset}
        )
        
        rows = []
        for row in result:
            row_dict = dict(row._mapping)
            # Serialize datetime objects
            for k, v in row_dict.items():
                if isinstance(v, datetime):
                    row_dict[k] = v.isoformat()
            rows.append(row_dict)
        
        return {
            "table": table_name,
            "total": total,
            "columns": columns,
            "rows": rows
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database xatosi: {str(e)}")


@router.put("/db/tables/{table_name}/{row_id}")
async def update_table_row(
    table_name: str,
    row_id: str,
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update a row in a table"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    try:
        # Build SET clause
        set_parts = []
        params = {"row_id": row_id}
        for key, value in data.items():
            if key in ("id", "created_at"):  # Don't allow changing these
                continue
            safe_key = key.replace('"', '')  # prevent SQL injection in key
            set_parts.append(f'"{safe_key}" = :val_{safe_key}')
            params[f"val_{safe_key}"] = value
        
        if not set_parts:
            raise HTTPException(status_code=400, detail="O'zgartirish uchun ma'lumot yo'q")
        
        set_clause = ", ".join(set_parts)
        
        # Find primary key column
        pk_result = await db.execute(text("""
            SELECT column_name FROM information_schema.key_column_usage
            WHERE table_name = :tbl AND constraint_name LIKE '%pkey%'
            LIMIT 1
        """), {"tbl": table_name})
        pk_row = pk_result.first()
        pk_col = pk_row[0] if pk_row else "id"
        
        await db.execute(
            text(f'UPDATE "{table_name}" SET {set_clause} WHERE "{pk_col}" = :row_id'),
            params
        )
        await db.commit()
        
        return {"message": f"Qator yangilandi", "table": table_name, "id": row_id}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database xatosi: {str(e)}")


@router.delete("/db/tables/{table_name}/{row_id}")
async def delete_table_row(
    table_name: str,
    row_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a row from a table"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Super admin only")
    
    try:
        # Find primary key column
        pk_result = await db.execute(text("""
            SELECT column_name FROM information_schema.key_column_usage
            WHERE table_name = :tbl AND constraint_name LIKE '%pkey%'
            LIMIT 1
        """), {"tbl": table_name})
        pk_row = pk_result.first()
        pk_col = pk_row[0] if pk_row else "id"
        
        result = await db.execute(
            text(f'DELETE FROM "{table_name}" WHERE "{pk_col}" = :row_id'),
            {"row_id": row_id}
        )
        await db.commit()
        
        return {"message": "Qator o'chirildi", "table": table_name, "id": row_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database xatosi: {str(e)}")


# ============================================================================
# CONTENT MANAGEMENT - pedagog (lessons & ertaklar proxy via Lessions API)
# ============================================================================

@router.get("/content/lessons")
async def list_content_lessons(
    admin: Dict = Depends(verify_admin),
    subject: Optional[str] = None,
    language: Optional[str] = None,
):
    """List lessons (proxy to Lessions backend)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        params = {}
        if subject:
            params["subject"] = subject
        if language:
            params["language"] = language
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{LESSIONS_API}/lessons", params=params, timeout=10)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.post("/content/lessons")
async def create_content_lesson(
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
):
    """Create lesson (proxy to Lessions backend)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{LESSIONS_API}/lessons", json=data, timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.put("/content/lessons/{lesson_id}")
async def update_content_lesson(
    lesson_id: str,
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
):
    """Update lesson"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.put(f"{LESSIONS_API}/lessons/{lesson_id}", json=data, timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.delete("/content/lessons/{lesson_id}")
async def delete_content_lesson(
    lesson_id: str,
    admin: Dict = Depends(verify_admin),
):
    """Delete lesson"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(f"{LESSIONS_API}/lessons/{lesson_id}", timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.get("/content/ertaklar")
async def list_content_ertaklar(
    admin: Dict = Depends(verify_admin),
    language: Optional[str] = None,
    age_group: Optional[str] = None,
):
    """List ertaklar (stories)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        params = {}
        if language:
            params["language"] = language
        if age_group:
            params["age_group"] = age_group
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{LESSIONS_API}/ertaklar", params=params, timeout=10)
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.post("/content/ertaklar")
async def create_content_ertak(
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
):
    """Create ertak"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{LESSIONS_API}/ertaklar", json=data, timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


@router.delete("/content/ertaklar/{ertak_id}")
async def delete_content_ertak(
    ertak_id: str,
    admin: Dict = Depends(verify_admin),
):
    """Delete ertak"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(f"{LESSIONS_API}/ertaklar/{ertak_id}", timeout=10)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lessions service xatosi: {str(e)}")


# ============================================================================
# TELEGRAM MANAGEMENT
# ============================================================================

@router.get("/telegram/users")
async def list_telegram_users(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """List Telegram-linked users"""
    if not has_permission(admin, "telegram") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    stmt = select(TelegramUser)
    count_stmt = select(func.count(TelegramUser.id))
    
    if search:
        search_filter = f"%{search}%"
        search_cond = (
            (TelegramUser.phone.ilike(search_filter)) |
            (TelegramUser.telegram_username.ilike(search_filter))
        )
        stmt = stmt.where(search_cond)
        count_stmt = count_stmt.where(search_cond)
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.limit(limit))
    users = result.scalars().all()
    
    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "telegram_chat_id": u.telegram_chat_id,
                "telegram_username": u.telegram_username,
                "notifications_enabled": u.notifications_enabled,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def admin_health():
    """Admin panel health check"""
    return {
        "status": "healthy",
        "roles": list(ADMIN_KEYS.keys()),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============================================================================
# PLATFORM CONTENT MANAGEMENT - for admins to manage static content
# ============================================================================

from shared.database.models.platform_content import PlatformContent

@router.get("/content/{key}")
async def get_content_by_key(
    key: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get content value by key (for frontend compatibility)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(status_code=404, detail="Kontent topilmadi")
    
    return {"success": True, "data": {"key": content.key, "value": content.value}}


@router.put("/content/{key}")
async def update_content_by_key(
    key: str,
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update content value by key (frontend sends { value: ... })"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    value = data.get("value")
    if value is None:
        raise HTTPException(status_code=400, detail="'value' maydoni kerak")
    
    result = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    content = result.scalar_one_or_none()
    
    if not content:
        content = PlatformContent(key=key, value=value)
        db.add(content)
        message = "Kontent yaratildi"
    else:
        content.value = value
        content.updated_at = datetime.now(timezone.utc)
        message = "Kontent yangilandi"
    
    await db.commit()
    
    return {"success": True, "message": message, "key": key}


@router.get("/platform-content")
async def list_platform_content(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all platform content (key-value pairs)"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    stmt = select(PlatformContent).order_by(PlatformContent.key)
    count_stmt = select(func.count(PlatformContent.id))
    
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(PlatformContent.key.ilike(search_filter))
        count_stmt = count_stmt.where(PlatformContent.key.ilike(search_filter))
    
    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    items = result.scalars().all()
    
    return {
        "total": total,
        "items": [
            {
                "id": item.id,
                "key": item.key,
                "value": item.value,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            }
            for item in items
        ]
    }


@router.get("/platform-content/{key}")
async def get_platform_content(
    key: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get specific platform content by key"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Kontent topilmadi")
    
    return {
        "id": item.id,
        "key": item.key,
        "value": item.value,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


class PlatformContentCreate(BaseModel):
    key: str
    value: Any

@router.post("/platform-content")
async def create_platform_content(
    body: PlatformContentCreate,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create new platform content key-value pair"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    existing = await db.execute(select(PlatformContent).where(PlatformContent.key == body.key))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"'{body.key}' kaliti allaqachon mavjud")
    
    content = PlatformContent(key=body.key, value=body.value)
    db.add(content)
    await db.commit()
    await db.refresh(content)
    
    return {"message": "Kontent yaratildi", "key": body.key}


class PlatformContentBody(BaseModel):
    value: Any

@router.put("/platform-content/{key}")
async def update_platform_content(
    key: str,
    body: PlatformContentBody,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update platform content value"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    result = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    content = result.scalar_one_or_none()
    
    if not content:
        content = PlatformContent(key=key, value=body.value)
        db.add(content)
        message = "Kontent yaratildi"
    else:
        content.value = body.value
        content.updated_at = datetime.now(timezone.utc)
        message = "Kontent yangilandi"
    
    await db.commit()
    
    return {"message": message, "key": key}


@router.delete("/platform-content/{key}")
async def delete_platform_content(
    key: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete platform content"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin o'chira oladi")
    
    result = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    content = result.scalar_one_or_none()
    
    if not content:
        raise HTTPException(status_code=404, detail="Kontent topilmadi")
    
    await db.delete(content)
    await db.commit()
    
    return {"message": "Kontent o'chirildi", "key": key}


# ============================================================================
# UNIVERSAL CRUD - Super admin can edit any table directly
# ============================================================================

@router.post("/universal/{table_name}")
async def universal_create(
    table_name: str,
    data: Dict[str, Any],
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Universal create endpoint for super admin"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin")
    
    try:
        # Build INSERT statement dynamically
        columns = list(data.keys())
        values = list(data.values())
        
        col_names = ', '.join([f'"{c}"' for c in columns])
        placeholders = ', '.join([f':val_{i}' for i in range(len(values))])
        
        params = {f"val_{i}": v for i, v in enumerate(values)}
        
        result = await db.execute(
            text(f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders}) RETURNING id'),
            params
        )
        new_id = result.scalar()
        await db.commit()
        
        return {"message": "Yaratildi", "table": table_name, "id": new_id}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Xato: {str(e)}")


# ============================================================================
# ADMIN STATS & ANALYTICS
# ============================================================================

@router.get("/stats/daily")
async def get_daily_stats(
    days: int = Query(7, ge=1, le=30),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get daily registration and activity stats"""
    if not has_permission(admin, "all") and not has_permission(admin, "view"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    
    from datetime import timedelta
    
    stats = []
    for i in range(days):
        date = datetime.now(timezone.utc) - timedelta(days=i)
        date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # New users on this date
        new_users = await db.scalar(
            select(func.count(User.id)).where(
                User.created_at >= date_start,
                User.created_at <= date_end
            )
        ) or 0
        
        stats.append({
            "date": date_start.strftime("%Y-%m-%d"),
            "new_users": new_users,
        })
    
    return {"stats": list(reversed(stats))}


# ============================================================================
# SUBSCRIPTION PLAN CONFIG MANAGEMENT (Admin-configurable)
# ============================================================================

class PlanConfigCreateRequest(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price: int = 0
    duration_days: int = 30
    max_children: int = 1
    features: Optional[Dict[str, Any]] = None
    is_active: bool = True
    sort_order: int = 0

class PlanConfigUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    duration_days: Optional[int] = None
    max_children: Optional[int] = None
    features: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


@router.get("/subscription-plans")
async def list_subscription_plans(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Barcha obuna planlarini ko'rish"""
    result = await db.execute(
        select(SubscriptionPlanConfig).order_by(SubscriptionPlanConfig.sort_order)
    )
    plans = result.scalars().all()
    return {"plans": [p.to_dict() for p in plans]}


@router.post("/subscription-plans")
async def create_subscription_plan(
    data: PlanConfigCreateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Yangi obuna plan yaratish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin")

    # Slug tekshirish
    existing = await db.execute(
        select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.slug == data.slug)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"'{data.slug}' slug allaqachon mavjud")

    plan = SubscriptionPlanConfig(
        name=data.name,
        slug=data.slug,
        description=data.description,
        price=data.price,
        duration_days=data.duration_days,
        max_children=data.max_children,
        features=data.features,
        is_active=data.is_active,
        sort_order=data.sort_order,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return {"message": "Plan yaratildi", "plan": plan.to_dict()}


@router.put("/subscription-plans/{plan_id}")
async def update_subscription_plan(
    plan_id: str,
    data: PlanConfigUpdateRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Plan sozlamalarini o'zgartirish (narx, nom, imkoniyatlar)"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin")

    result = await db.execute(
        select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan topilmadi")

    if data.name is not None:
        plan.name = data.name
    if data.description is not None:
        plan.description = data.description
    if data.price is not None:
        plan.price = data.price
    if data.duration_days is not None:
        plan.duration_days = data.duration_days
    if data.max_children is not None:
        plan.max_children = data.max_children
    if data.features is not None:
        plan.features = data.features
    if data.is_active is not None:
        plan.is_active = data.is_active
    if data.sort_order is not None:
        plan.sort_order = data.sort_order

    await db.commit()
    await db.refresh(plan)

    return {"message": "Plan yangilandi", "plan": plan.to_dict()}


@router.delete("/subscription-plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Obuna planni o'chirish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin")

    result = await db.execute(
        select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan topilmadi")

    # Faol obunalar bor-yo'qligini tekshirish
    active_subs = await db.scalar(
        select(func.count(UserSubscription.id)).where(
            UserSubscription.plan_config_id == plan_id,
            UserSubscription.status == SubscriptionStatus.active.value,
        )
    ) or 0

    if active_subs > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Bu planga {active_subs} ta faol obuna bor. Avval ularni bekor qiling."
        )

    await db.delete(plan)
    await db.commit()

    return {"message": "Plan o'chirildi", "plan_id": plan_id}


# ============================================================================
# USER SUBSCRIPTION MANAGEMENT
# ============================================================================

class UserSubscriptionRequest(BaseModel):
    plan_config_id: str
    amount_paid: int = 0
    notes: Optional[str] = None


@router.get("/subscriptions")
async def list_subscriptions(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Barcha foydalanuvchi obunalarini ko'rish"""
    stmt = (
        select(UserSubscription)
        .order_by(UserSubscription.created_at.desc())
    )
    count_stmt = select(func.count(UserSubscription.id))

    if status:
        stmt = stmt.where(UserSubscription.status == status)
        count_stmt = count_stmt.where(UserSubscription.status == status)

    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    subs = result.scalars().all()

    # Foydalanuvchi ma'lumotlarini olish
    items = []
    for sub in subs:
        user_res = await db.execute(select(User).where(User.id == sub.user_id))
        user = user_res.scalar_one_or_none()

        plan_res = await db.execute(
            select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == sub.plan_config_id)
        )
        plan = plan_res.scalar_one_or_none()

        items.append({
            "id": sub.id,
            "user_id": sub.user_id,
            "user_name": f"{user.first_name} {user.last_name}" if user else None,
            "user_phone": user.phone if user else None,
            "user_role": user.role.value if user and user.role else None,
            "plan_name": plan.name if plan else None,
            "plan_slug": plan.slug if plan else None,
            "plan_price": plan.price if plan else None,
            "status": sub.status,
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
            "amount_paid": sub.amount_paid,
            "created_by": sub.created_by,
            "notes": sub.notes,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
        })

    return {"total": total, "subscriptions": items}


@router.get("/subscriptions/stats")
async def subscription_stats(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Obuna statistikasi"""
    # Planlar bo'yicha faol obunalar
    plans = (await db.execute(
        select(SubscriptionPlanConfig).order_by(SubscriptionPlanConfig.sort_order)
    )).scalars().all()

    plan_stats = []
    total_active = 0
    total_revenue = 0

    for plan in plans:
        count = await db.scalar(
            select(func.count(UserSubscription.id)).where(
                UserSubscription.plan_config_id == plan.id,
                UserSubscription.status == SubscriptionStatus.active.value,
            )
        ) or 0

        revenue = await db.scalar(
            select(func.sum(UserSubscription.amount_paid)).where(
                UserSubscription.plan_config_id == plan.id,
            )
        ) or 0

        plan_stats.append({
            "plan_id": plan.id,
            "plan_name": plan.name,
            "plan_slug": plan.slug,
            "plan_price": plan.price,
            "active_count": count,
            "total_revenue": int(revenue),
        })

        total_active += count
        total_revenue += int(revenue)

    # Obunasiz foydalanuvchilar soni
    total_users = await db.scalar(select(func.count(User.id))) or 0
    free_users = total_users - total_active

    return {
        "total_users": total_users,
        "total_active_subscriptions": total_active,
        "free_users": free_users,
        "total_revenue": total_revenue,
        "plans": plan_stats,
    }


@router.post("/subscriptions/{user_id}")
async def assign_subscription(
    user_id: str,
    data: UserSubscriptionRequest,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Foydalanuvchiga obuna berish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin")

    # User tekshirish
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    # Plan tekshirish
    plan_res = await db.execute(
        select(SubscriptionPlanConfig).where(SubscriptionPlanConfig.id == data.plan_config_id)
    )
    plan = plan_res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan topilmadi")

    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Bu plan faol emas")

    # Eski faol obunani expire qilish
    old_subs = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active.value,
        )
    )
    for old in old_subs.scalars().all():
        old.status = SubscriptionStatus.expired.value

    # Yangi obuna yaratish
    now = datetime.now(timezone.utc)
    subscription = UserSubscription(
        user_id=user_id,
        plan_config_id=plan.id,
        status=SubscriptionStatus.active.value,
        started_at=now,
        expires_at=now + timedelta(days=plan.duration_days),
        amount_paid=data.amount_paid,
        created_by=admin["role"],
        notes=data.notes,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)

    return {
        "message": f"{user.first_name} {user.last_name} ga '{plan.name}' obuna berildi",
        "subscription_id": subscription.id,
        "expires_at": subscription.expires_at.isoformat(),
    }


@router.delete("/subscriptions/{user_id}")
async def cancel_subscription(
    user_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Foydalanuvchi obunasini bekor qilish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin")

    result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active.value,
        )
    )
    subs = result.scalars().all()

    if not subs:
        raise HTTPException(status_code=404, detail="Faol obuna topilmadi")

    for sub in subs:
        sub.status = SubscriptionStatus.cancelled.value
        sub.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return {"message": "Obuna bekor qilindi", "user_id": user_id, "cancelled_count": len(subs)}
