"""
Classroom Router - Sinf boshqaruv tizimi
Teacher: sinf yaratish, o'quvchi taklif qilish
Student: sinflari, takliflar
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.database.models import User, UserRole, TeacherProfile
from shared.database.models.classroom import (
    Classroom, ClassroomStudent, ClassroomInvitation,
    ClassroomStudentStatus, InvitationStatus, InvitationType,
    generate_invite_code,
)
from shared.database.models.in_app_notification import InAppNotification, InAppNotifType
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================
# SCHEMAS
# ============================================================

class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    max_students: int = Field(default=40, ge=1, le=100)


class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    description: Optional[str] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None


class InviteStudentRequest(BaseModel):
    identifier: str = Field(..., description="Telefon, email yoki user_id")
    invitation_type: str = Field(..., description="phone | email | user_id")
    message: Optional[str] = None


class InvitationResponse(BaseModel):
    action: str = Field(..., description="accept | decline")


class JoinByCodeRequest(BaseModel):
    invite_code: str = Field(..., min_length=6, max_length=6)


# ============================================================
# HELPERS
# ============================================================

async def get_teacher_profile(user: User, db: AsyncSession) -> TeacherProfile:
    if user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar uchun")
    res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == user.id))
    profile = res.scalar_one_or_none()
    if not profile:
        profile = TeacherProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    return profile


async def create_notification(
    db: AsyncSession, user_id: str, title: str, message: str,
    notif_type: InAppNotifType, reference_type: str = None,
    reference_id: str = None, sender_id: str = None,
):
    notif = InAppNotification(
        user_id=user_id, title=title, message=message,
        notif_type=notif_type, reference_type=reference_type,
        reference_id=reference_id, sender_id=sender_id,
    )
    db.add(notif)


async def notify_telegram(db: AsyncSession, user_id: str, message: str):
    try:
        from shared.database.models import TelegramUser
        from app.core.config import settings
        tg_res = await db.execute(select(TelegramUser).where(TelegramUser.user_id == user_id))
        tg_user = tg_res.scalar_one_or_none()
        if tg_user and tg_user.telegram_chat_id and tg_user.notifications_enabled:
            import httpx
            token = settings.TELEGRAM_BOT_TOKEN
            if token:
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(
                        f"https://api.telegram.org/bot{token}/sendMessage",
                        json={"chat_id": tg_user.telegram_chat_id, "text": message, "parse_mode": "Markdown"},
                    )
    except Exception as e:
        logger.warning(f"Telegram notify failed for {user_id}: {e}")


def classroom_dict(c: Classroom, student_count: int = 0) -> dict:
    return {
        "id": c.id, "name": c.name, "subject": c.subject,
        "grade_level": c.grade_level, "description": c.description,
        "invite_code": c.invite_code, "max_students": c.max_students,
        "is_active": c.is_active, "student_count": student_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ============================================================
# TEACHER: CLASSROOM CRUD
# ============================================================

@router.post("/teachers/classrooms")
async def create_classroom(
    data: ClassroomCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    classroom = Classroom(
        teacher_id=teacher.id, name=data.name, subject=data.subject,
        grade_level=data.grade_level, description=data.description,
        max_students=data.max_students, invite_code=generate_invite_code(),
    )
    db.add(classroom)
    teacher.total_classrooms = (teacher.total_classrooms or 0) + 1
    await db.commit()
    await db.refresh(classroom)
    logger.info(f"Classroom created: {classroom.name} by {current_user.id}")
    return {"success": True, "data": {"class": classroom_dict(classroom)}}


async def _fetch_my_classrooms(current_user, db):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.teacher_id == teacher.id)
        .order_by(Classroom.created_at.desc())
    )
    classrooms = res.scalars().all()
    result = []
    for c in classrooms:
        cnt = await db.execute(
            select(func.count(ClassroomStudent.id)).where(
                ClassroomStudent.classroom_id == c.id,
                ClassroomStudent.status == ClassroomStudentStatus.active,
            )
        )
        result.append(classroom_dict(c, cnt.scalar() or 0))
    return {"success": True, "data": {"classes": result, "total": len(result)}}


@router.get("/teachers/my-classes")
async def get_my_classes_alias(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _fetch_my_classrooms(current_user, db)


@router.get("/teachers/classrooms")
async def get_my_classrooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _fetch_my_classrooms(current_user, db)


@router.get("/teachers/classrooms/{classroom_id}")
async def get_classroom_detail(
    classroom_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher.id)
    )
    classroom = res.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")

    members_res = await db.execute(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    members = members_res.scalars().all()
    students = []
    for m in members:
        u_res = await db.execute(select(User).where(User.id == m.student_user_id))
        u = u_res.scalar_one_or_none()
        if u:
            students.append({
                "user_id": u.id, "first_name": u.first_name,
                "last_name": u.last_name, "email": u.email, "phone": u.phone,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            })
    return {"success": True, "data": {"class": classroom_dict(classroom, len(students)), "students": students}}


@router.put("/teachers/classrooms/{classroom_id}")
async def update_classroom(
    classroom_id: str, data: ClassroomUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher.id)
    )
    classroom = res.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(classroom, k, v)
    await db.commit()
    await db.refresh(classroom)
    return {"success": True, "data": {"class": classroom_dict(classroom)}}


@router.delete("/teachers/classrooms/{classroom_id}")
async def delete_classroom(
    classroom_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher.id)
    )
    classroom = res.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")
    await db.delete(classroom)
    teacher.total_classrooms = max(0, (teacher.total_classrooms or 1) - 1)
    await db.commit()
    return {"success": True, "message": "Sinf o'chirildi"}


# ============================================================
# TEACHER: STUDENT DETAIL
# ============================================================

@router.get("/teachers/students/{student_user_id}/detail")
async def get_student_detail(
    student_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchi haqida to'liq ma'lumot — ism, yosh, ota-ona, telefon, progress"""
    await get_teacher_profile(current_user, db)

    # Get student user
    u_res = await db.execute(select(User).where(User.id == student_user_id))
    student = u_res.scalar_one_or_none()
    if not student or student.role != UserRole.student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    # Get student profile
    from shared.database.models import StudentProfile
    sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == student.id))
    profile = sp_res.scalar_one_or_none()

    # Find parent via StudentProfile.parent_user_id
    parent_info = None
    if profile and profile.parent_user_id:
        parent_res = await db.execute(select(User).where(User.id == profile.parent_user_id))
        parent = parent_res.scalar_one_or_none()
        if parent:
            parent_info = {
                "id": parent.id,
                "first_name": parent.first_name,
                "last_name": parent.last_name,
                "phone": parent.phone,
                "email": parent.email,
            }

    # Get classrooms this student is in (for this teacher)
    student_classes = []
    try:
        from shared.database.models.classroom import TeacherProfile as TP
        tp_res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
        tp = tp_res.scalar_one_or_none()
        if tp:
            cls_res = await db.execute(
                select(ClassroomStudent, Classroom)
                .join(Classroom, ClassroomStudent.classroom_id == Classroom.id)
                .where(
                    ClassroomStudent.student_user_id == student.id,
                    ClassroomStudent.status == ClassroomStudentStatus.active,
                    Classroom.teacher_id == tp.id,
                )
            )
            for cs, cls in cls_res.all():
                student_classes.append({"id": cls.id, "name": cls.name, "subject": cls.subject})
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "id": student.id,
            "first_name": student.first_name,
            "last_name": student.last_name,
            "email": student.email,
            "phone": student.phone,
            "birth_date": student.birth_date.isoformat() if hasattr(student, 'birth_date') and student.birth_date else None,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "profile": {
                "level": profile.level if profile else 1,
                "total_points": profile.total_points if profile else 0,
                "total_lessons_completed": profile.total_lessons_completed if profile else 0,
                "total_games_played": profile.total_games_played if profile else 0,
                "average_score": profile.average_score if profile else 0,
                "current_streak": profile.current_streak if profile else 0,
            } if profile else None,
            "parent": parent_info,
            "classrooms": student_classes,
        }
    }


# ============================================================
# TEACHER: INVITE & MANAGE STUDENTS
# ============================================================

@router.get("/teachers/students/search")
async def search_students(
    query: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_teacher_profile(current_user, db)
    s = f"%{query}%"
    res = await db.execute(
        select(User).where(
            User.role == UserRole.student,
            or_(User.first_name.ilike(s), User.last_name.ilike(s),
                User.email.ilike(s), User.phone.ilike(s), User.id.ilike(s))
        ).limit(20)
    )
    users = res.scalars().all()
    return {"success": True, "data": [
        {"user_id": u.id, "first_name": u.first_name, "last_name": u.last_name,
         "email": u.email, "phone": u.phone}
        for u in users
    ]}


@router.post("/teachers/classrooms/{classroom_id}/invite")
async def invite_student(
    classroom_id: str, data: InviteStudentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher.id)
    )
    classroom = res.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")

    try:
        inv_type = InvitationType(data.invitation_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="invitation_type: phone | email | user_id")

    student_user = None
    if inv_type == InvitationType.phone:
        r = await db.execute(select(User).where(User.phone == data.identifier))
        student_user = r.scalar_one_or_none()
    elif inv_type == InvitationType.email:
        r = await db.execute(select(User).where(User.email == data.identifier.lower()))
        student_user = r.scalar_one_or_none()
    elif inv_type == InvitationType.user_id:
        r = await db.execute(select(User).where(User.id == data.identifier))
        student_user = r.scalar_one_or_none()

    if not student_user:
        raise HTTPException(status_code=404, detail=f"Foydalanuvchi topilmadi: {data.identifier}")
    if student_user.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Faqat o'quvchilarni taklif qilish mumkin")

    # Allaqachon sinfda?
    ex = await db.execute(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_user_id == student_user.id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    if ex.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu o'quvchi allaqachon sinfda")

    # Pending taklif bormi?
    ex2 = await db.execute(
        select(ClassroomInvitation).where(
            ClassroomInvitation.classroom_id == classroom_id,
            ClassroomInvitation.student_user_id == student_user.id,
            ClassroomInvitation.status == InvitationStatus.pending,
        )
    )
    if ex2.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Taklif allaqachon yuborilgan")

    invitation = ClassroomInvitation(
        classroom_id=classroom_id, invited_by=current_user.id,
        invitation_type=inv_type, identifier=data.identifier,
        student_user_id=student_user.id, message=data.message,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()

    teacher_name = f"{current_user.first_name} {current_user.last_name}".strip()
    msg = f"{teacher_name} sizni «{classroom.name}» sinfiga taklif qildi."
    if data.message:
        msg += f"\n\nXabar: {data.message}"

    await create_notification(
        db, student_user.id, f"📚 Sinfga taklif: {classroom.name}", msg,
        InAppNotifType.classroom_invite, "invitation", invitation.id, current_user.id,
    )
    await db.commit()

    subject_text = classroom.subject or "Ko'rsatilmagan"
    tg_msg = (
        f"📚 *Sinfga taklif!*\n\n"
        f"O'qituvchi *{teacher_name}* sizni «*{classroom.name}*» sinfiga taklif qildi.\n"
        f"Fan: {subject_text}\n\n"
        f"Qabul qilish uchun platformaga kiring."
    )
    await notify_telegram(db, student_user.id, tg_msg)

    return {"success": True, "message": f"Taklif yuborildi: {student_user.first_name} {student_user.last_name}",
            "data": {"invitation_id": invitation.id}}


@router.post("/teachers/classrooms/{classroom_id}/students")
async def add_student_direct(
    classroom_id: str, data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher.id)
    )
    classroom = res.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")

    student_user_id = data.get("student_user_id")
    if not student_user_id:
        raise HTTPException(status_code=400, detail="student_user_id kerak")

    u_res = await db.execute(select(User).where(User.id == student_user_id))
    student = u_res.scalar_one_or_none()
    if not student or student.role != UserRole.student:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")

    ex = await db.execute(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_user_id == student_user_id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    if ex.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu o'quvchi allaqachon sinfda")

    db.add(ClassroomStudent(
        classroom_id=classroom_id, student_user_id=student_user_id,
        status=ClassroomStudentStatus.active,
    ))
    teacher_name = f"{current_user.first_name} {current_user.last_name}".strip()
    await create_notification(
        db, student_user_id, f"📚 {classroom.name} sinfiga qo'shildingiz",
        f"{teacher_name} sizni «{classroom.name}» sinfiga qo'shdi.",
        InAppNotifType.classroom_invite, "classroom", classroom_id, current_user.id,
    )
    await db.commit()
    tg_text = f"📚 Siz *{classroom.name}* sinfiga qo'shildingiz!\nO'qituvchi: {teacher_name}"
    await notify_telegram(db, student_user_id, tg_text)
    return {"success": True, "message": "O'quvchi sinfga qo'shildi"}


@router.delete("/teachers/classrooms/{classroom_id}/students/{student_user_id}")
async def remove_student(
    classroom_id: str, student_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Classroom).where(Classroom.id == classroom_id, Classroom.teacher_id == teacher.id)
    )
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Sinf topilmadi")

    m_res = await db.execute(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_user_id == student_user_id,
        )
    )
    member = m_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="O'quvchi sinfda topilmadi")

    member.status = ClassroomStudentStatus.removed
    member.removed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "message": "O'quvchi sinfdan chiqarildi"}


# ============================================================
# STUDENT: CLASSROOMS & INVITATIONS
# ============================================================

@router.get("/students/classrooms")
async def student_my_classrooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    res = await db.execute(
        select(ClassroomStudent).where(
            ClassroomStudent.student_user_id == current_user.id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    memberships = res.scalars().all()
    result = []
    for m in memberships:
        cls_res = await db.execute(select(Classroom).where(Classroom.id == m.classroom_id))
        cls = cls_res.scalar_one_or_none()
        if cls:
            t_res = await db.execute(
                select(User).join(TeacherProfile, TeacherProfile.user_id == User.id)
                .where(TeacherProfile.id == cls.teacher_id)
            )
            t = t_res.scalar_one_or_none()
            result.append({
                "classroom_id": cls.id, "name": cls.name, "subject": cls.subject,
                "grade_level": cls.grade_level,
                "teacher_name": f"{t.first_name} {t.last_name}".strip() if t else None,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            })
    return {"success": True, "data": {"classes": result, "total": len(result)}}


@router.get("/students/invitations")
async def student_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    res = await db.execute(
        select(ClassroomInvitation).where(
            ClassroomInvitation.student_user_id == current_user.id,
            ClassroomInvitation.status == InvitationStatus.pending,
        ).order_by(ClassroomInvitation.created_at.desc())
    )
    invitations = res.scalars().all()
    result = []
    for inv in invitations:
        cls_res = await db.execute(select(Classroom).where(Classroom.id == inv.classroom_id))
        cls = cls_res.scalar_one_or_none()
        inv_res = await db.execute(select(User).where(User.id == inv.invited_by))
        inviter = inv_res.scalar_one_or_none()
        result.append({
            "invitation_id": inv.id, "classroom_id": inv.classroom_id,
            "classroom_name": cls.name if cls else None,
            "subject": cls.subject if cls else None,
            "teacher_name": f"{inviter.first_name} {inviter.last_name}".strip() if inviter else None,
            "message": inv.message,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        })
    return {"success": True, "data": {"invitations": result, "total": len(result)}}


@router.post("/students/invitations/{invitation_id}/respond")
async def respond_invitation(
    invitation_id: str, data: InvitationResponse,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    res = await db.execute(
        select(ClassroomInvitation).where(
            ClassroomInvitation.id == invitation_id,
            ClassroomInvitation.student_user_id == current_user.id,
        )
    )
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Taklif topilmadi")
    if inv.status != InvitationStatus.pending:
        raise HTTPException(status_code=400, detail="Bu taklif allaqachon javob berilgan")
    if inv.expires_at and inv.expires_at < datetime.now(timezone.utc):
        inv.status = InvitationStatus.expired
        await db.commit()
        raise HTTPException(status_code=400, detail="Taklif muddati o'tib ketgan")

    if data.action == "accept":
        inv.status = InvitationStatus.accepted
        inv.responded_at = datetime.now(timezone.utc)
        ex = await db.execute(
            select(ClassroomStudent).where(
                ClassroomStudent.classroom_id == inv.classroom_id,
                ClassroomStudent.student_user_id == current_user.id,
            )
        )
        if not ex.scalar_one_or_none():
            db.add(ClassroomStudent(
                classroom_id=inv.classroom_id,
                student_user_id=current_user.id,
                status=ClassroomStudentStatus.active,
            ))
        cls_res = await db.execute(select(Classroom).where(Classroom.id == inv.classroom_id))
        cls = cls_res.scalar_one_or_none()
        if cls:
            t_res = await db.execute(
                select(User).join(TeacherProfile, TeacherProfile.user_id == User.id)
                .where(TeacherProfile.id == cls.teacher_id)
            )
            t = t_res.scalar_one_or_none()
            if t:
                student_name = f"{current_user.first_name} {current_user.last_name}".strip()
                await create_notification(
                    db, t.id, f"✅ {student_name} sinfga qo'shildi",
                    f"{student_name} «{cls.name}» sinfiga qo'shildi.",
                    InAppNotifType.system, "classroom", cls.id, current_user.id,
                )
        await db.commit()
        return {"success": True, "message": "Sinfga muvaffaqiyatli qo'shildingiz!"}

    elif data.action == "decline":
        inv.status = InvitationStatus.declined
        inv.responded_at = datetime.now(timezone.utc)
        await db.commit()
        return {"success": True, "message": "Taklif rad etildi"}

    raise HTTPException(status_code=400, detail="action: 'accept' yoki 'decline'")


@router.post("/students/classrooms/join")
async def join_by_code(
    data: JoinByCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite code orqali sinfga qo'shilish"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    res = await db.execute(
        select(Classroom).where(
            Classroom.invite_code == data.invite_code.upper(),
            Classroom.is_active == True,
        )
    )
    classroom = res.scalar_one_or_none()
    if not classroom:
        raise HTTPException(status_code=404, detail="Noto'g'ri kod yoki sinf topilmadi")

    ex = await db.execute(
        select(ClassroomStudent).where(
            ClassroomStudent.classroom_id == classroom.id,
            ClassroomStudent.student_user_id == current_user.id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    if ex.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Siz allaqachon bu sinfdasiz")

    db.add(ClassroomStudent(
        classroom_id=classroom.id,
        student_user_id=current_user.id,
        status=ClassroomStudentStatus.active,
    ))
    await db.commit()
    return {"success": True, "message": f"«{classroom.name}» sinfiga qo'shildingiz!",
            "data": {"classroom_id": classroom.id, "name": classroom.name}}


# ============================================================
# PARENT: CHILD'S TEACHERS INFO
# ============================================================

@router.get("/parents/children/{child_id}/teachers")
async def get_child_teachers(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ota-ona uchun: bolasining o'qituvchilari haqida ma'lumot.
    Bolaning qaysi sinflarda ekanligini va har bir sinf o'qituvchisini qaytaradi.
    """
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    # Verify this is parent's child (check User.parent_id OR StudentProfile.parent_user_id)
    child_res = await db.execute(select(User).where(User.id == child_id, User.parent_id == current_user.id))
    child = child_res.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Bola topilmadi yoki sizning bolangiz emas")

    # Get child's classrooms
    cs_res = await db.execute(
        select(ClassroomStudent, Classroom)
        .join(Classroom, ClassroomStudent.classroom_id == Classroom.id)
        .where(
            ClassroomStudent.student_user_id == child_id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    rows = cs_res.all()

    teachers_info = []
    for cs, cls in rows:
        # Get teacher user via TeacherProfile
        t_res = await db.execute(
            select(User, TeacherProfile)
            .join(TeacherProfile, TeacherProfile.user_id == User.id)
            .where(TeacherProfile.id == cls.teacher_id)
        )
        row = t_res.first()
        if row:
            teacher_user, teacher_profile = row
            teachers_info.append({
                "classroom": {
                    "id": cls.id,
                    "name": cls.name,
                    "subject": cls.subject,
                    "grade_level": cls.grade_level,
                },
                "teacher": {
                    "id": teacher_user.id,
                    "first_name": teacher_user.first_name,
                    "last_name": teacher_user.last_name,
                    "phone": teacher_user.phone,
                    "email": teacher_user.email,
                    "specialty": teacher_profile.specialty if hasattr(teacher_profile, 'specialty') else None,
                    "experience_years": teacher_profile.experience_years if hasattr(teacher_profile, 'experience_years') else None,
                    "bio": teacher_profile.bio if hasattr(teacher_profile, 'bio') else None,
                },
            })

    return {"success": True, "data": teachers_info}
