"""
Organization Router - Ta'lim tashkiloti boshqaruv tizimi
/api/v1/organization/...

Imkoniyatlar:
- Dashboard statistika
- O'qituvchilarni boshqarish (qo'shish, olib tashlash, tasdiqlash)
- O'quvchilarni boshqarish (qo'shish, yaratish, olib tashlash)
- Foydalanuvchi qidirish (ID, telefon, email)
- Kontent boshqaruvi (darslar)
- Sinflar ko'rish
- Tashkilot profili
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc
from pydantic import BaseModel

from shared.database import get_db
from shared.database.models import (
    User, UserRole, AccountStatus, TeacherStatus,
    TeacherProfile, StudentProfile, Lesson,
    Classroom, ClassroomStudent
)
from shared.database.models.organization import OrganizationProfile
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# HELPERS
# ============================================================================

async def get_org_profile(user: User, db: AsyncSession) -> OrganizationProfile:
    """Get organization profile for current user, raise 403 if not org"""
    if user.role != UserRole.organization:
        raise HTTPException(status_code=403, detail="Faqat tashkilot foydalanuvchilari uchun")
    
    result = await db.execute(
        select(OrganizationProfile).where(OrganizationProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        # Auto-create org profile if missing
        profile = OrganizationProfile(
            user_id=user.id,
            name=f"{user.first_name} {user.last_name}",
        )
        db.add(profile)
        await db.flush()
    
    return profile


def user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "phone": u.phone,
        "role": u.role.value if u.role else None,
        "status": u.status.value if u.status else None,
        "avatar": u.avatar,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


# ============================================================================
# DASHBOARD & STATS
# ============================================================================

@router.get("/stats")
async def get_org_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Real-time organization statistics"""
    org = await get_org_profile(current_user, db)
    
    # Count teachers
    teacher_count = await db.scalar(
        select(func.count(TeacherProfile.id)).where(
            TeacherProfile.organization_id == org.id
        )
    ) or 0
    
    # Count approved teachers
    approved_teachers = await db.scalar(
        select(func.count(TeacherProfile.id)).where(
            TeacherProfile.organization_id == org.id,
            TeacherProfile.verification_status == TeacherStatus.approved
        )
    ) or 0
    
    # Count pending teachers
    pending_teachers = await db.scalar(
        select(func.count(TeacherProfile.id)).where(
            TeacherProfile.organization_id == org.id,
            TeacherProfile.verification_status == TeacherStatus.pending
        )
    ) or 0
    
    # Count students
    student_count = await db.scalar(
        select(func.count(StudentProfile.id)).where(
            StudentProfile.organization_id == org.id
        )
    ) or 0
    
    # Count classrooms (via org teachers)
    teacher_ids_q = select(TeacherProfile.id).where(
        TeacherProfile.organization_id == org.id
    )
    classroom_count = await db.scalar(
        select(func.count(Classroom.id)).where(
            Classroom.teacher_id.in_(teacher_ids_q)
        )
    ) or 0
    
    # Count lessons (via org teachers + org-created)
    lesson_count = await db.scalar(
        select(func.count(Lesson.id)).where(
            or_(
                Lesson.teacher_id.in_(teacher_ids_q),
                Lesson.organization_id == org.id
            )
        )
    ) or 0
    
    return {
        "success": True,
        "stats": {
            "total_teachers": teacher_count,
            "approved_teachers": approved_teachers,
            "pending_teachers": pending_teachers,
            "total_students": student_count,
            "total_classrooms": classroom_count,
            "total_lessons": lesson_count,
        },
        "organization": {
            "id": org.id,
            "name": org.name,
            "district": org.district,
            "address": org.address,
        }
    }


# ============================================================================
# USER SEARCH - universal search for adding teachers/students
# ============================================================================

@router.get("/search-user")
async def search_user(
    q: str = Query(..., min_length=1, description="ID, telefon, email yoki ism"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by ID, phone, email or name to add to organization"""
    await get_org_profile(current_user, db)
    
    q = q.strip()
    
    # Build search conditions
    conditions = []
    
    # Exact ID match
    conditions.append(User.id == q)
    
    # Phone match (exact or partial)
    if q.replace("+", "").replace(" ", "").isdigit():
        clean_phone = q.replace("+", "").replace(" ", "")
        conditions.append(User.phone.ilike(f"%{clean_phone}%"))
    
    # Email match
    if "@" in q:
        conditions.append(User.email.ilike(f"%{q}%"))
    
    # Name match
    conditions.append(User.first_name.ilike(f"%{q}%"))
    conditions.append(User.last_name.ilike(f"%{q}%"))
    
    result = await db.execute(
        select(User).where(
            or_(*conditions),
            User.status == AccountStatus.active
        ).limit(20)
    )
    users = result.scalars().all()
    
    return {
        "success": True,
        "users": [user_to_dict(u) for u in users],
        "total": len(users)
    }


# ============================================================================
# TEACHER MANAGEMENT
# ============================================================================

@router.get("/teachers")
async def list_org_teachers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all teachers in the organization"""
    org = await get_org_profile(current_user, db)
    
    # Base query: join teacher_profiles with users
    base = (
        select(TeacherProfile, User)
        .join(User, TeacherProfile.user_id == User.id)
        .where(TeacherProfile.organization_id == org.id)
    )
    
    if status:
        try:
            ts = TeacherStatus(status)
            base = base.where(TeacherProfile.verification_status == ts)
        except ValueError:
            pass
    
    if search:
        search_term = f"%{search}%"
        base = base.where(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term),
            )
        )
    
    # Count
    count_q = select(func.count()).select_from(base.subquery())
    total = await db.scalar(count_q) or 0
    
    # Fetch
    result = await db.execute(base.order_by(desc(TeacherProfile.created_at)).offset(offset).limit(limit))
    rows = result.all()
    
    teachers = []
    for tp, u in rows:
        teachers.append({
            **user_to_dict(u),
            "teacher_profile_id": tp.id,
            "specialization": tp.specialization,
            "qualification": tp.qualification,
            "years_of_experience": tp.years_of_experience,
            "verification_status": tp.verification_status.value if tp.verification_status else None,
            "total_students": tp.total_students,
            "total_classrooms": tp.total_classrooms,
            "total_lessons_created": tp.total_lessons_created,
            "rating": tp.rating,
        })
    
    return {"success": True, "teachers": teachers, "total": total}


class AddTeacherRequest(BaseModel):
    user_id: str  # The user ID to add as teacher


@router.post("/teachers/add")
async def add_teacher_to_org(
    data: AddTeacherRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add existing user as teacher to organization"""
    org = await get_org_profile(current_user, db)
    
    # Find user
    result = await db.execute(select(User).where(User.id == data.user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    if target_user.role != UserRole.teacher:
        raise HTTPException(status_code=400, detail="Bu foydalanuvchi o'qituvchi emas")
    
    # Check if already in teacher_profiles
    result = await db.execute(
        select(TeacherProfile).where(TeacherProfile.user_id == target_user.id)
    )
    teacher_profile = result.scalar_one_or_none()
    
    if not teacher_profile:
        # Create teacher profile
        teacher_profile = TeacherProfile(
            user_id=target_user.id,
            organization_id=org.id,
            verification_status=TeacherStatus.approved,
        )
        db.add(teacher_profile)
    else:
        if teacher_profile.organization_id and teacher_profile.organization_id != org.id:
            raise HTTPException(status_code=400, detail="Bu o'qituvchi boshqa tashkilotga biriktirilgan")
        teacher_profile.organization_id = org.id
        teacher_profile.verification_status = TeacherStatus.approved
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"{target_user.first_name} {target_user.last_name} tashkilotga qo'shildi",
    }


@router.delete("/teachers/{user_id}")
async def remove_teacher_from_org(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove teacher from organization"""
    org = await get_org_profile(current_user, db)
    
    result = await db.execute(
        select(TeacherProfile).where(
            TeacherProfile.user_id == user_id,
            TeacherProfile.organization_id == org.id
        )
    )
    teacher_profile = result.scalar_one_or_none()
    
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="O'qituvchi topilmadi")
    
    teacher_profile.organization_id = None
    await db.commit()
    
    return {"success": True, "message": "O'qituvchi tashkilotdan chiqarildi"}


@router.get("/teachers/pending")
async def get_pending_teachers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get teachers pending approval"""
    org = await get_org_profile(current_user, db)
    
    result = await db.execute(
        select(TeacherProfile, User)
        .join(User, TeacherProfile.user_id == User.id)
        .where(
            TeacherProfile.organization_id == org.id,
            TeacherProfile.verification_status == TeacherStatus.pending
        )
        .order_by(desc(TeacherProfile.created_at))
    )
    rows = result.all()
    
    teachers = []
    for tp, u in rows:
        teachers.append({
            **user_to_dict(u),
            "teacher_profile_id": tp.id,
            "specialization": tp.specialization,
            "created_at": tp.created_at.isoformat() if tp.created_at else None,
        })
    
    return {"success": True, "teachers": teachers}


class TeacherApprovalRequest(BaseModel):
    action: str  # "approve" or "reject"
    reason: Optional[str] = None


@router.post("/teachers/{user_id}/review")
async def review_teacher(
    user_id: str,
    data: TeacherApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a pending teacher"""
    org = await get_org_profile(current_user, db)
    
    result = await db.execute(
        select(TeacherProfile).where(
            TeacherProfile.user_id == user_id,
            TeacherProfile.organization_id == org.id
        )
    )
    teacher_profile = result.scalar_one_or_none()
    
    if not teacher_profile:
        raise HTTPException(status_code=404, detail="O'qituvchi topilmadi")
    
    if data.action == "approve":
        teacher_profile.verification_status = TeacherStatus.approved
        teacher_profile.verified_at = datetime.now(timezone.utc)
        teacher_profile.verified_by = current_user.id
        msg = "O'qituvchi tasdiqlandi"
    elif data.action == "reject":
        teacher_profile.verification_status = TeacherStatus.rejected
        teacher_profile.rejection_reason = data.reason
        msg = "O'qituvchi rad etildi"
    else:
        raise HTTPException(status_code=400, detail="action 'approve' yoki 'reject' bo'lishi kerak")
    
    await db.commit()
    return {"success": True, "message": msg}


# ============================================================================
# STUDENT MANAGEMENT
# ============================================================================

@router.get("/students")
async def list_org_students(
    search: Optional[str] = None,
    grade: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all students in the organization"""
    org = await get_org_profile(current_user, db)
    
    base = (
        select(StudentProfile, User)
        .join(User, StudentProfile.user_id == User.id)
        .where(StudentProfile.organization_id == org.id)
    )
    
    if grade:
        base = base.where(StudentProfile.grade == grade)
    
    if search:
        search_term = f"%{search}%"
        base = base.where(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term),
                User.id == search.strip(),
            )
        )
    
    count_q = select(func.count()).select_from(base.subquery())
    total = await db.scalar(count_q) or 0
    
    result = await db.execute(base.order_by(desc(StudentProfile.created_at)).offset(offset).limit(limit))
    rows = result.all()
    
    students = []
    for sp, u in rows:
        students.append({
            **user_to_dict(u),
            "student_profile_id": sp.id,
            "grade": sp.grade,
            "school_name": sp.school_name,
            "level": sp.level,
            "total_points": sp.total_points,
            "total_coins": sp.total_coins,
            "current_streak": sp.current_streak,
            "total_lessons_completed": sp.total_lessons_completed,
            "average_score": sp.average_score,
            "last_activity_at": sp.last_activity_at.isoformat() if sp.last_activity_at else None,
        })
    
    return {"success": True, "students": students, "total": total}


class AddStudentRequest(BaseModel):
    user_id: str


@router.post("/students/add")
async def add_student_to_org(
    data: AddStudentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add existing student to organization by user ID"""
    org = await get_org_profile(current_user, db)
    
    # Find user
    result = await db.execute(select(User).where(User.id == data.user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    
    if target_user.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Bu foydalanuvchi o'quvchi emas")
    
    # Check/create student profile
    result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == target_user.id)
    )
    student_profile = result.scalar_one_or_none()
    
    if not student_profile:
        student_profile = StudentProfile(
            user_id=target_user.id,
            organization_id=org.id,
        )
        db.add(student_profile)
    else:
        if student_profile.organization_id and student_profile.organization_id != org.id:
            raise HTTPException(status_code=400, detail="Bu o'quvchi boshqa tashkilotga biriktirilgan")
        student_profile.organization_id = org.id
    
    await db.commit()
    
    return {
        "success": True,
        "message": f"{target_user.first_name} {target_user.last_name} tashkilotga qo'shildi",
    }


class CreateStudentRequest(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    grade: Optional[str] = None
    password: Optional[str] = None


@router.post("/students/create")
async def create_student_in_org(
    data: CreateStudentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new student account and add to organization"""
    org = await get_org_profile(current_user, db)
    
    # Check if phone/email already exists
    if data.phone:
        existing = await db.scalar(select(User).where(User.phone == data.phone))
        if existing:
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")
    
    if data.email:
        existing = await db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")
    
    # Create user
    new_user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        email=data.email,
        role=UserRole.student,
        status=AccountStatus.active,
    )
    if data.password:
        new_user.set_password(data.password)
    
    db.add(new_user)
    await db.flush()
    
    # Create student profile
    student_profile = StudentProfile(
        user_id=new_user.id,
        organization_id=org.id,
        grade=data.grade,
        school_name=org.name,
    )
    db.add(student_profile)
    await db.commit()
    
    return {
        "success": True,
        "message": f"O'quvchi yaratildi: {data.first_name} {data.last_name}",
        "user_id": new_user.id,
    }


@router.get("/students/{user_id}")
async def get_student_detail(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed student info"""
    org = await get_org_profile(current_user, db)
    
    result = await db.execute(
        select(StudentProfile, User)
        .join(User, StudentProfile.user_id == User.id)
        .where(
            StudentProfile.user_id == user_id,
            StudentProfile.organization_id == org.id,
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    
    sp, u = row
    
    # Get classrooms
    cs_result = await db.execute(
        select(ClassroomStudent, Classroom)
        .join(Classroom, ClassroomStudent.classroom_id == Classroom.id)
        .where(ClassroomStudent.student_user_id == user_id)
    )
    classrooms = [
        {"id": c.id, "name": c.name, "subject": c.subject, "grade_level": c.grade_level}
        for _, c in cs_result.all()
    ]
    
    return {
        "success": True,
        "student": {
            **user_to_dict(u),
            "grade": sp.grade,
            "school_name": sp.school_name,
            "level": sp.level,
            "total_points": sp.total_points,
            "total_coins": sp.total_coins,
            "current_streak": sp.current_streak,
            "total_lessons_completed": sp.total_lessons_completed,
            "average_score": sp.average_score,
            "classrooms": classrooms,
        }
    }


@router.delete("/students/{user_id}")
async def remove_student_from_org(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove student from organization"""
    org = await get_org_profile(current_user, db)
    
    result = await db.execute(
        select(StudentProfile).where(
            StudentProfile.user_id == user_id,
            StudentProfile.organization_id == org.id
        )
    )
    student_profile = result.scalar_one_or_none()
    
    if not student_profile:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    
    student_profile.organization_id = None
    await db.commit()
    
    return {"success": True, "message": "O'quvchi tashkilotdan chiqarildi"}


# ============================================================================
# CLASSROOMS - view org classrooms
# ============================================================================

@router.get("/classrooms")
async def list_org_classrooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all classrooms in the organization (via teachers)"""
    org = await get_org_profile(current_user, db)
    
    # Get org teacher IDs
    teacher_ids_q = select(TeacherProfile.id).where(
        TeacherProfile.organization_id == org.id
    )
    
    result = await db.execute(
        select(Classroom, TeacherProfile, User)
        .join(TeacherProfile, Classroom.teacher_id == TeacherProfile.id)
        .join(User, TeacherProfile.user_id == User.id)
        .where(Classroom.teacher_id.in_(teacher_ids_q))
        .order_by(desc(Classroom.created_at))
    )
    rows = result.all()
    
    classrooms = []
    for c, tp, u in rows:
        # Count students in classroom
        student_count = await db.scalar(
            select(func.count(ClassroomStudent.id)).where(
                ClassroomStudent.classroom_id == c.id,
                ClassroomStudent.status == "active"
            )
        ) or 0
        
        classrooms.append({
            "id": c.id,
            "name": c.name,
            "subject": c.subject,
            "grade_level": c.grade_level,
            "description": c.description,
            "invite_code": c.invite_code,
            "is_active": c.is_active,
            "student_count": student_count,
            "teacher": {
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}",
            },
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    
    return {"success": True, "classrooms": classrooms, "total": len(classrooms)}


# ============================================================================
# LESSONS - content management
# ============================================================================

class OrgLessonCreate(BaseModel):
    title: str
    subject: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[str] = None
    language: str = "uz"
    video_url: Optional[str] = None
    attachments: Optional[Any] = None


@router.get("/lessons")
async def list_org_lessons(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List lessons created by org teachers"""
    org = await get_org_profile(current_user, db)
    
    teacher_ids_q = select(TeacherProfile.id).where(
        TeacherProfile.organization_id == org.id
    )
    
    base = select(Lesson).where(
        or_(
            Lesson.teacher_id.in_(teacher_ids_q),
            Lesson.organization_id == org.id
        )
    )
    
    if search:
        base = base.where(Lesson.title.ilike(f"%{search}%"))
    
    total = await db.scalar(
        select(func.count()).select_from(base.subquery())
    ) or 0
    
    result = await db.execute(base.order_by(desc(Lesson.created_at)).offset(offset).limit(limit))
    lessons = result.scalars().all()
    
    return {
        "success": True,
        "lessons": [
            {
                "id": l.id,
                "title": l.title,
                "subject": l.subject,
                "grade_level": l.grade_level,
                "language": getattr(l, 'language', 'uz'),
                "video_url": l.video_url,
                "attachments": l.attachments,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in lessons
        ],
        "total": total,
    }


@router.post("/lessons")
async def create_org_lesson(
    data: OrgLessonCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create lesson as organization (no teacher_id required)"""
    org = await get_org_profile(current_user, db)
    
    lesson = Lesson(
        title=data.title,
        subject=data.subject,
        content=data.content,
        grade_level=data.grade_level,
        video_url=data.video_url,
        attachments=data.attachments,
        organization_id=org.id,
    )
    # Set language if model supports it
    if hasattr(Lesson, 'language'):
        lesson.language = data.language
    
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    
    return {
        "success": True,
        "message": "Dars yaratildi",
        "lesson_id": lesson.id,
    }


@router.delete("/lessons/{lesson_id}")
async def delete_org_lesson(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a lesson"""
    org = await get_org_profile(current_user, db)
    
    teacher_ids_q = select(TeacherProfile.id).where(
        TeacherProfile.organization_id == org.id
    )
    result = await db.execute(
        select(Lesson).where(
            Lesson.id == lesson_id,
            or_(
                Lesson.teacher_id.in_(teacher_ids_q),
                Lesson.organization_id == org.id
            )
        )
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi yoki sizga tegishli emas")
    
    await db.delete(lesson)
    await db.commit()
    
    return {"success": True, "message": "Dars o'chirildi"}


# ============================================================================
# ORGANIZATION PROFILE
# ============================================================================

class OrgProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    license_number: Optional[str] = None


@router.get("/profile")
async def get_org_profile_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get organization profile"""
    org = await get_org_profile(current_user, db)
    
    return {
        "success": True,
        "profile": {
            "id": org.id,
            "name": org.name,
            "address": org.address,
            "district": org.district,
            "phone": org.phone,
            "website": org.website,
            "license_number": org.license_number,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        }
    }


@router.put("/profile")
async def update_org_profile(
    data: OrgProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update organization profile"""
    org = await get_org_profile(current_user, db)
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    
    await db.commit()
    
    return {"success": True, "message": "Profil yangilandi"}


# ============================================================================
# MY SCHOOL - for teachers and students to see their organization
# ============================================================================

@router.get("/my-school")
async def get_my_school(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's organization info (for teachers and students)"""
    org_id = None
    
    if current_user.role == UserRole.teacher:
        result = await db.execute(
            select(TeacherProfile).where(TeacherProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            org_id = profile.organization_id
    
    elif current_user.role == UserRole.student:
        result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            org_id = profile.organization_id
    
    elif current_user.role == UserRole.parent:
        # Find child's org
        result = await db.execute(
            select(StudentProfile).where(StudentProfile.parent_user_id == current_user.id)
        )
        child_profiles = result.scalars().all()
        for cp in child_profiles:
            if cp.organization_id:
                org_id = cp.organization_id
                break
    
    if not org_id:
        return {"success": True, "school": None}
    
    result = await db.execute(
        select(OrganizationProfile).where(OrganizationProfile.id == org_id)
    )
    org = result.scalar_one_or_none()
    
    if not org:
        return {"success": True, "school": None}
    
    # Get org stats for display
    teacher_count = await db.scalar(
        select(func.count(TeacherProfile.id)).where(TeacherProfile.organization_id == org_id)
    ) or 0
    student_count = await db.scalar(
        select(func.count(StudentProfile.id)).where(StudentProfile.organization_id == org_id)
    ) or 0
    
    return {
        "success": True,
        "school": {
            "id": org.id,
            "name": org.name,
            "address": org.address,
            "district": org.district,
            "phone": org.phone,
            "website": org.website,
            "total_teachers": teacher_count,
            "total_students": student_count,
        }
    }
