"""
Assignment Router - Vazifa tizimi
Teacher: vazifa yaratish, sinfga/studentga berish, baholash
Student: vazifalarni ko'rish, topshirish
Parent: bolasining vazifalari, o'zi vazifa berish
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.database.models import User, UserRole, TeacherProfile, StudentProfile, StoryReadingRecord, Story
from shared.database.models.classroom import Classroom, ClassroomStudent, ClassroomStudentStatus
from shared.database.models.assignment import (
    Assignment, AssignmentTarget, AssignmentSubmission,
    AssignmentType, AssignmentTargetType, SubmissionStatus, AssignmentCreatorRole,
)
from shared.database.models.in_app_notification import InAppNotification, InAppNotifType
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================
# SCHEMAS
# ============================================================

class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    description: Optional[str] = None
    assignment_type: str = Field(default="homework")
    content: Optional[str] = None
    attachments: Optional[list] = None
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    max_score: int = Field(default=100, ge=0, le=1000)
    due_date: Optional[datetime] = None
    classroom_id: Optional[str] = None
    target_student_ids: Optional[List[str]] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    max_score: Optional[int] = None
    due_date: Optional[datetime] = None
    is_published: Optional[bool] = None


class SubmissionCreate(BaseModel):
    content: Optional[str] = None
    attachments: Optional[list] = None


class GradeSubmission(BaseModel):
    score: float = Field(..., ge=0)
    feedback: Optional[str] = None


# ============================================================
# HELPERS
# ============================================================

async def get_teacher_profile(user: User, db: AsyncSession) -> TeacherProfile:
    if user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar uchun")
    res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == user.id))
    profile = res.scalars().first()
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
    db.add(InAppNotification(
        user_id=user_id, title=title, message=message,
        notif_type=notif_type, reference_type=reference_type,
        reference_id=reference_id, sender_id=sender_id,
    ))


async def notify_telegram(db: AsyncSession, user_id: str, message: str):
    try:
        from shared.database.models import TelegramUser
        from app.core.config import settings
        tg_res = await db.execute(select(TelegramUser).where(TelegramUser.user_id == user_id))
        tg_user = tg_res.scalars().first()
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


def assignment_dict(a: Assignment) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "description": getattr(a, 'description', None),
        "assignment_type": a.assignment_type.value if hasattr(a.assignment_type, 'value') else a.assignment_type,
        "content": getattr(a, 'content', None),
        "attachments": getattr(a, 'attachments', None),
        "reference_id": getattr(a, 'reference_id', None),
        "reference_type": getattr(a, 'reference_type', None),
        "max_score": getattr(a, 'max_score', 100),
        "due_date": a.due_date.isoformat() if getattr(a, 'due_date', None) else None,
        "classroom_id": getattr(a, 'classroom_id', None),
        "is_published": getattr(a, 'is_published', True),
        "creator_role": a.creator_role.value if hasattr(a.creator_role, 'value') else a.creator_role,
        "created_at": a.created_at.isoformat() if getattr(a, 'created_at', None) else None,
    }


def submission_dict(s: AssignmentSubmission) -> dict:
    return {
        "id": s.id,
        "assignment_id": s.assignment_id,
        "student_user_id": s.student_user_id,
        "content": getattr(s, 'content', None),
        "attachments": getattr(s, 'attachments', None),
        "score": getattr(s, 'score', None),
        "feedback": getattr(s, 'feedback', None),
        "status": s.status.value if hasattr(s.status, 'value') else s.status,
        "submitted_at": s.submitted_at.isoformat() if getattr(s, 'submitted_at', None) else None,
        "graded_at": s.graded_at.isoformat() if getattr(s, 'graded_at', None) else None,
    }


# ============================================================
# TEACHER: ASSIGNMENT CRUD
# ============================================================

@router.post("/teachers/assignments")
async def create_assignment(
    data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    O'qituvchi vazifa yaratadi.
    classroom_id berilsa — butun sinfga.
    target_student_ids berilsa — individual o'quvchilarga.
    Ikkalasi ham berilsa — sinfga + qo'shimcha o'quvchilarga.
    """
    teacher = await get_teacher_profile(current_user, db)

    try:
        a_type = AssignmentType(data.assignment_type)
    except ValueError:
        a_type = AssignmentType.homework

    assignment = Assignment(
        created_by=current_user.id,
        creator_role=AssignmentCreatorRole.teacher,
        classroom_id=data.classroom_id,
        title=data.title,
        description=data.description,
        assignment_type=a_type,
        content=data.content,
        attachments=data.attachments,
        reference_id=data.reference_id,
        reference_type=data.reference_type,
        max_score=data.max_score,
        due_date=data.due_date,
        is_published=True,
    )
    db.add(assignment)
    await db.flush()

    notified_students = set()

    # Sinfga berish
    if data.classroom_id:
        cls_res = await db.execute(
            select(Classroom).where(
                Classroom.id == data.classroom_id,
                Classroom.teacher_id == teacher.id,
            )
        )
        classroom = cls_res.scalars().first()
        if not classroom:
            raise HTTPException(status_code=404, detail="Sinf topilmadi")

        db.add(AssignmentTarget(
            assignment_id=assignment.id,
            target_type=AssignmentTargetType.classroom,
            target_id=data.classroom_id,
        ))

        # Sinfdagi barcha o'quvchilarga notification
        members_res = await db.execute(
            select(ClassroomStudent).where(
                ClassroomStudent.classroom_id == data.classroom_id,
                ClassroomStudent.status == ClassroomStudentStatus.active,
            )
        )
        for m in members_res.scalars().all():
            notified_students.add(m.student_user_id)

    # Individual o'quvchilarga berish
    if data.target_student_ids:
        for sid in data.target_student_ids:
            db.add(AssignmentTarget(
                assignment_id=assignment.id,
                target_type=AssignmentTargetType.student,
                target_id=sid,
            ))
            notified_students.add(sid)

    # Submission yozuvlari + notificationlar
    teacher_name = f"{current_user.first_name} {current_user.last_name}".strip()
    due_text = data.due_date.strftime("%d.%m.%Y %H:%M") if data.due_date else "Belgilanmagan"

    for student_id in notified_students:
        # Submission record yaratish (pending)
        db.add(AssignmentSubmission(
            assignment_id=assignment.id,
            student_user_id=student_id,
            status=SubmissionStatus.pending,
        ))
        # In-app notification
        await create_notification(
            db, student_id,
            f"📝 Yangi vazifa: {data.title}",
            f"{teacher_name} sizga yangi vazifa berdi.\nMuddati: {due_text}",
            InAppNotifType.assignment_new,
            "assignment", assignment.id, current_user.id,
        )

    await db.commit()
    await db.refresh(assignment)

    # Telegram notifications (after commit)
    tg_due = due_text
    for student_id in notified_students:
        tg_text = (
            f"📝 *Yangi vazifa!*\n\n"
            f"*{data.title}*\n"
            f"O'qituvchi: {teacher_name}\n"
            f"Muddati: {tg_due}\n\n"
            f"Platformaga kiring va vazifani bajaring."
        )
        await notify_telegram(db, student_id, tg_text)

    logger.info(f"Assignment created: {assignment.title} by {current_user.id}, notified {len(notified_students)} students")
    return {
        "success": True,
        "data": {
            "assignment": assignment_dict(assignment),
            "notified_students": len(notified_students),
        }
    }


@router.get("/teachers/assignments")
async def get_teacher_assignments(
    classroom_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'qituvchining barcha vazifalari"""
    await get_teacher_profile(current_user, db)

    stmt = select(Assignment).where(Assignment.created_by == current_user.id)
    if classroom_id:
        stmt = stmt.where(Assignment.classroom_id == classroom_id)
    stmt = stmt.order_by(Assignment.created_at.desc())

    res = await db.execute(stmt)
    assignments = res.scalars().all()

    result = []
    for a in assignments:
        d = assignment_dict(a)
        # Submission statistikasi
        sub_res = await db.execute(
            select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == a.id)
        )
        subs = sub_res.scalars().all()
        d["total_students"] = len(subs)
        d["submitted_count"] = sum(1 for s in subs if str(getattr(s, 'status', '')) in [SubmissionStatus.submitted, SubmissionStatus.graded])
        d["graded_count"] = sum(1 for s in subs if str(getattr(s, 'status', '')) == SubmissionStatus.graded)
        result.append(d)

    return {"success": True, "data": {"assignments": result, "total": len(result)}}


@router.get("/teachers/assignments/{assignment_id}")
async def get_assignment_detail(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Vazifa tafsilotlari + topshiruvlar"""
    await get_teacher_profile(current_user, db)

    res = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.created_by == current_user.id,
        )
    )
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    subs_res = await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id)
    )
    submissions = []
    for s in subs_res.scalars().all():
        sd = submission_dict(s)
        u_res = await db.execute(select(User).where(User.id == s.student_user_id))
        u = u_res.scalars().first()
        if u:
            sd["student_name"] = f"{u.first_name} {u.last_name}".strip()
        submissions.append(sd)

    return {
        "success": True,
        "data": {
            "assignment": assignment_dict(assignment),
            "submissions": submissions,
        }
    }


@router.put("/teachers/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: str, data: AssignmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.created_by == current_user.id,
        )
    )
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(assignment, k, v)
    await db.commit()
    await db.refresh(assignment)
    return {"success": True, "data": {"assignment": assignment_dict(assignment)}}


@router.delete("/teachers/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_teacher_profile(current_user, db)
    res = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.created_by == current_user.id,
        )
    )
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")
    await db.delete(assignment)
    await db.commit()
    return {"success": True, "message": "Vazifa o'chirildi"}


@router.post("/teachers/assignments/{assignment_id}/grade/{submission_id}")
async def grade_submission(
    assignment_id: str, submission_id: str, data: GradeSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchi topshiruvini baholash"""
    await get_teacher_profile(current_user, db)

    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.id == submission_id,
            AssignmentSubmission.assignment_id == assignment_id,
        )
    )
    submission = res.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Topshiruv topilmadi")

    submission.score = data.score
    submission.feedback = data.feedback
    submission.status = SubmissionStatus.graded
    submission.graded_at = datetime.now(timezone.utc)
    submission.graded_by = current_user.id

    # O'quvchiga notification
    a_res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_res.scalars().first()
    if assignment:
        await create_notification(
            db, submission.student_user_id,
            f"✅ Vazifa baholandi: {assignment.title}",
            f"Sizning vazifangiz baholandi. Ball: {data.score}/{assignment.max_score}",
            InAppNotifType.assignment_graded,
            "assignment", assignment_id, current_user.id,
        )

    await db.commit()
    return {"success": True, "data": {"submission": submission_dict(submission)}}


# ============================================================
# STUDENT: ASSIGNMENTS
# ============================================================

@router.get("/students/assignments")
async def student_assignments(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchiga berilgan barcha vazifalar.
    
    1. O'quvchining shaxsiy submission larini qaytaradi.
    2. O'quvchi qaysi sinflarga kirsa, o'sha sinflarga berilgan
       barcha vazifalarni ham tekshiradi. Agar submission yo'q bo'lsa,
       avtomatik ravishda 'pending' holda yaratadi.
    """
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    # --- 1. qism: O'quvchining sinflari ---
    classrooms_res = await db.execute(
        select(ClassroomStudent.classroom_id).where(
            ClassroomStudent.student_user_id == current_user.id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )
    classroom_ids = [row[0] for row in classrooms_res.fetchall()]

    # --- 2. qism: Sinflarga berilgan barcha vazifalarni topish ---
    if classroom_ids:
        cls_targets_res = await db.execute(
            select(AssignmentTarget.assignment_id).where(
                AssignmentTarget.target_type == AssignmentTargetType.classroom,
                AssignmentTarget.target_id.in_(classroom_ids),
            )
        )
        cls_assignment_ids = [row[0] for row in cls_targets_res.fetchall()]

        # O'quvchining mavjud submissionlari (sinf vazifalari bo'yicha)
        existing_subs_res = await db.execute(
            select(AssignmentSubmission.assignment_id).where(
                AssignmentSubmission.student_user_id == current_user.id,
                AssignmentSubmission.assignment_id.in_(cls_assignment_ids),
            )
        )
        existing_submission_ids = {row[0] for row in existing_subs_res.fetchall()}

        # Yo'q bo'lgan submission larni avtomatik yaratish (on-demand)
        for assignment_id in cls_assignment_ids:
            if assignment_id not in existing_submission_ids:
                a_res = await db.execute(
                    select(Assignment).where(
                        Assignment.id == assignment_id,
                        Assignment.is_published == True,
                    )
                )
                assignment = a_res.scalars().first()
                if assignment:
                    new_sub = AssignmentSubmission(
                        assignment_id=assignment_id,
                        student_user_id=current_user.id,
                        status=SubmissionStatus.pending,
                    )
                    db.add(new_sub)
                    logger.info(
                        f"Auto-created submission for student={current_user.id} "
                        f"assignment={assignment_id} (classroom join after assignment creation)"
                    )

        if any(a_id not in existing_submission_ids for a_id in cls_assignment_ids):
            await db.commit()

    # --- 3. qism: Barcha submission larni qaytarish ---
    stmt = select(AssignmentSubmission).where(
        AssignmentSubmission.student_user_id == current_user.id
    )
    if status:
        try:
            stmt = stmt.where(AssignmentSubmission.status == SubmissionStatus(status))
        except ValueError:
            pass
    stmt = stmt.order_by(AssignmentSubmission.created_at.desc())

    res = await db.execute(stmt)
    submissions = res.scalars().all()

    result = []
    for s in submissions:
        # Fetch assignment with classroom joined if possible
        a_res = await db.execute(select(Assignment).where(Assignment.id == s.assignment_id))
        a = a_res.scalars().first()
        if a:
            t_res = await db.execute(select(User).where(User.id == a.created_by))
            t = t_res.scalars().first()
            
            # Fetch classroom name if classroom_id exists
            classroom_name = None
            if a.classroom_id:
                from shared.database.models.classroom import Classroom
                c_res = await db.execute(select(Classroom.name).where(Classroom.id == a.classroom_id))
                classroom_name = c_res.scalars().first()

            result.append({
                **submission_dict(s),
                "assignment": assignment_dict(a),
                "teacher_name": f"{t.first_name} {t.last_name}".strip() if t else None,
                "classroom_name": classroom_name,
            })

    return {"success": True, "data": {"assignments": result, "total": len(result)}}


@router.post("/students/assignments/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: str, data: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchi vazifani topshiradi"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_user_id == current_user.id,
        )
    )
    submission = res.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi yoki sizga berilmagan")

    if submission.status == SubmissionStatus.graded:
        raise HTTPException(status_code=400, detail="Vazifa allaqachon baholangan")

    a_res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_res.scalars().first()

    # Muddati o'tganmi?
    is_late = False
    if assignment and assignment.due_date and assignment.due_date < datetime.now(timezone.utc):
        is_late = True

    was_pending = submission.status == SubmissionStatus.pending
    submission.content = data.content
    submission.attachments = data.attachments
    submission.status = SubmissionStatus.late if is_late else SubmissionStatus.submitted
    submission.submitted_at = datetime.now(timezone.utc)

    # O'qituvchiga notification
    if assignment:
        student_name = f"{current_user.first_name} {current_user.last_name}".strip()
        await create_notification(
            db, assignment.created_by,
            f"📬 Yangi topshiruv: {assignment.title}",
            f"{student_name} vazifani topshirdi.",
            InAppNotifType.submission_received,
            "assignment", assignment_id, current_user.id,
        )

    # Vazifa bajarish uchun +50 coin (avtomatik) - faqat birinchi marta
    coins_earned = 0
    if was_pending:
        try:
            from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType
            sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
            sp = sp_res.scalars().first()
            if sp:
                sc_res = await db.execute(select(StudentCoin).where(StudentCoin.student_id == sp.id))
                coin = sc_res.scalars().first()
                if not coin:
                    coin = StudentCoin(student_id=sp.id, current_balance=0, total_earned=0, total_spent=0, total_withdrawn=0)
                    db.add(coin)
                    await db.flush()
                coin.add_coins(50)
                db.add(CoinTransaction(
                    student_coin_id=coin.id,
                    type=TransactionType.assignment_complete,
                    amount=50,
                    description=f"Vazifa bajarildi: {assignment.title if assignment else 'Vazifa'}",
                    reference_id=assignment_id,
                    reference_type="assignment",
                ))
                coins_earned = 50

                # Gamification: XP & Streak
                from app.services.gamification_service import GamificationService
                xp_result = await GamificationService.add_xp(db, sp.id, 50)
                streak = await GamificationService.update_daily_streak(db, sp.id)
        except Exception as e:
            logger.warning(f"Gamification update failed for {current_user.id}: {e}")

    await db.commit()
    return {
        "success": True,
        "message": "Vazifa topshirildi" + (" (kech)" if is_late else "") + (f" (+{coins_earned} coin)" if coins_earned else ""),
        "data": {"submission": submission_dict(submission), "coins_earned": coins_earned},
    }


class ErtakSubmission(BaseModel):
    wpm: int = 0
    read_percent: float = 0
    reading_time_seconds: int = 0
    quiz_scores: List[dict] = []
    quiz_average: float = 0

@router.post("/students/assignments/{assignment_id}/submit-ertak")
async def submit_ertak_assignment(
    assignment_id: str,
    data: ErtakSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ertak tipli vazifani topshirish — Olympiada uslubida"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    # Submission mavjudmi?
    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_user_id == current_user.id,
        )
    )
    submission = res.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi yoki sizga berilmagan")
    
    if submission.status == SubmissionStatus.graded:
        # Allaqachon topshirilgan bo'lsa ham yangilashga ruxsat beramiz (record uchun)
        pass

    # Assignment olish
    a_res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_res.scalars().first()
    if not assignment or assignment.reference_type != 'ertak':
        raise HTTPException(status_code=400, detail="Bu vazifa ertak emas")

    story_id = assignment.reference_id
    if not story_id:
        raise HTTPException(status_code=400, detail="Ertak ID topilmadi")

    # 1. Submissionni yangilash
    import json
    summary = {
        "wpm": data.wpm,
        "read_percent": data.read_percent,
        "reading_time_seconds": data.reading_time_seconds,
        "answers": data.quiz_scores,
        "quiz_score": data.quiz_average,
    }
    submission.content = json.dumps(summary)
    submission.score = data.quiz_average
    submission.status = SubmissionStatus.graded
    submission.submitted_at = datetime.now(timezone.utc)
    submission.graded_at = datetime.now(timezone.utc)
    submission.feedback = f"Ertak o'qildi. WPM: {data.wpm}, Quiz: {data.quiz_average}%"

    # 2. StoryReadingRecord yaratish yoki yangilash (Kutubxonaga tushishi uchun)
    existing_record_res = await db.execute(
        select(StoryReadingRecord).where(
            StoryReadingRecord.student_user_id == current_user.id,
            StoryReadingRecord.story_id == story_id
        )
    )
    record = existing_record_res.scalars().first()
    if record:
        # Mavjud bo'lsa yangilaymiz (agar yangi ball yuqoriroq bo'lsa yoki har doim - bu mantiq sizga bog'liq)
        record.wpm = data.wpm
        record.quiz_score = int(data.quiz_average)
        record.updated_at = datetime.now(timezone.utc)
    else:
        record = StoryReadingRecord(
            student_user_id=current_user.id,
            story_id=story_id,
            wpm=data.wpm,
            quiz_score=int(data.quiz_average)
        )
        db.add(record)

    # 3. Gamification: Coin & XP
    coins_earned = 0
    try:
        from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType
        from app.services.gamification_service import GamificationService
        
        sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        sp = sp_res.scalars().first()
        if sp:
            # XP
            xp_amount = assignment.xp or 100
            await GamificationService.add_xp(db, sp.id, xp_amount)
            
            # Coins
            bonus = (10 if data.wpm >= 60 else 5 if data.wpm >= 40 else 2) + \
                    (15 if data.quiz_average >= 80 else 8 if data.quiz_average >= 50 else 3)
            
            sc_res = await db.execute(select(StudentCoin).where(StudentCoin.student_id == sp.id))
            coin = sc_res.scalars().first()
            if coin:
                coin.add_coins(bonus)
                db.add(CoinTransaction(
                    student_coin_id=coin.id,
                    type=TransactionType.assignment_complete,
                    amount=bonus,
                    description=f"Ertak bajarildi: {assignment.title}",
                    reference_id=assignment_id,
                    reference_type="assignment",
                ))
                coins_earned = bonus
    except Exception as e:
        logger.warning(f"Ertak submission gamification error: {e}")

    await db.commit()
    return {"success": True, "coins_earned": coins_earned}

# ============================================================
# STUDENT: TEST AUTO-GRADE
# ============================================

class TestSubmission(BaseModel):
    answers: dict  # {"0": "b", "1": "a", ...} — savol indeksi: tanlangan javob
    time_spent_seconds: Optional[int] = None

@router.post("/students/assignments/{assignment_id}/submit-test")
async def submit_test_assignment(
    assignment_id: str,
    data: TestSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test tipli vazifani topshirish — avtomatik baholash"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    # Submission mavjudmi?
    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_user_id == current_user.id,
        )
    )
    submission = res.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi yoki sizga berilmagan")
    if submission.status == SubmissionStatus.graded:
        raise HTTPException(status_code=400, detail="Test allaqachon baholangan")

    # Assignment va content olish
    a_res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_res.scalars().first()
    if not assignment or assignment.assignment_type != AssignmentType.test:
        raise HTTPException(status_code=400, detail="Bu vazifa test emas")

    # Content JSON parse
    import json
    try:
        test_data = json.loads(assignment.content)
        questions = test_data.get("questions", [])
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Test ma'lumotlari noto'g'ri formatda")

    if not questions:
        raise HTTPException(status_code=400, detail="Test savollari topilmadi")

    # Baholash
    correct_count = 0
    total = len(questions)
    results = []
    
    def normalize(val):
        if val is None: return ""
        v = str(val).strip().lower()
        # 'a' -> '0', 'b' -> '1' etc.
        if v in ['a', 'b', 'c', 'd', 'e', 'f']:
            return str(ord(v) - ord('a'))
        return v

    for i, q in enumerate(questions):
        student_answer = data.answers.get(str(i), "")
        correct_answer = q.get("correct_answer", "")
        
        s_norm = normalize(student_answer)
        c_norm = normalize(correct_answer)

        is_correct = s_norm == c_norm
        if is_correct:
            correct_count += 1
            
        # Variant matnlarini olish
        options = q.get("options", [])
        student_opt_text = ""
        correct_opt_text = ""
        
        try:
            if isinstance(options, list):
                s_idx = int(s_norm)
                if 0 <= s_idx < len(options): student_opt_text = options[s_idx]
                c_idx = int(c_norm)
                if 0 <= c_idx < len(options): correct_opt_text = options[c_idx]
            elif isinstance(options, dict):
                student_opt_text = options.get(str(student_answer).lower(), "") or options.get(s_norm, "")
                correct_opt_text = options.get(str(correct_answer).lower(), "") or options.get(c_norm, "")
        except:
            pass

        results.append({
            "question": q.get("question", ""),
            "student_answer": student_answer,
            "correct_answer": correct_answer,
            "student_option_text": student_opt_text,
            "correct_option_text": correct_opt_text,
            "is_correct": is_correct,
        })

    # Score hisoblash (max_score asosida)
    score = round((correct_count / max(total, 1)) * (assignment.max_score or 100), 1)

    # Submission yangilash
    summary = {
        "answers": data.answers,
        "results": results,
        "correct_count": correct_count,
        "total": total,
        "score": score,
        "time_spent_seconds": data.time_spent_seconds,
    }
    submission.content = json.dumps(summary)
    submission.meta_data = {
        "correct": correct_count,
        "total": total,
        "time_spent_seconds": data.time_spent_seconds,
    }
    submission.score = score
    submission.status = SubmissionStatus.graded
    submission.submitted_at = datetime.now(timezone.utc)
    submission.graded_at = datetime.now(timezone.utc)
    submission.feedback = f"Avtomatik baholandi: {correct_count}/{total} to'g'ri ({score}/{assignment.max_score or 100} ball)"

    # Notification o'qituvchiga
    student_name = f"{current_user.first_name} {current_user.last_name}".strip()
    await create_notification(
        db, assignment.created_by,
        f"Test topshirildi: {assignment.title}",
        f"{student_name} testni topshirdi. Natija: {correct_count}/{total} ({score} ball)",
        InAppNotifType.submission_received,
        "assignment", assignment_id, current_user.id,
    )

    # Coin mukofot
    coins_earned = 0
    try:
        from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType
        sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        sp = sp_res.scalars().first()
        if sp:
            sc_res = await db.execute(select(StudentCoin).where(StudentCoin.student_id == sp.id))
            coin = sc_res.scalars().first()
            if not coin:
                coin = StudentCoin(student_id=sp.id, current_balance=0, total_earned=0, total_spent=0, total_withdrawn=0)
                db.add(coin)
                await db.flush()
            bonus = 50 + (correct_count * 10)  # har bir to'g'ri javob +10 coin
            coin.add_coins(bonus)
            db.add(CoinTransaction(
                student_coin_id=coin.id,
                type=TransactionType.assignment_complete,
                amount=bonus,
                description=f"Test bajarildi: {assignment.title} ({correct_count}/{total})",
                reference_id=assignment_id,
                reference_type="assignment",
            ))
            coins_earned = bonus

            # Gamification: XP & Streak
            from app.services.gamification_service import GamificationService
            xp_amount = 100 + int(score) # Test pass + score bonus
            xp_result = await GamificationService.add_xp(db, sp.id, xp_amount)
            streak = await GamificationService.update_daily_streak(db, sp.id)
    except Exception as e:
        logger.warning(f"Gamification update failed for {current_user.id}: {e}")

    await db.commit()

    return {
        "success": True,
        "message": f"Test topshirildi! Natija: {correct_count}/{total}",
        "data": {
            "score": score,
            "max_score": assignment.max_score or 100,
            "correct_count": correct_count,
            "total": total,
            "results": results,
            "coins_earned": coins_earned,
        }
    }


# ============================================================
# STUDENT: ERTAK (STORY) AUTO-GRADE
# ============================================================

class ErtakSubmission(BaseModel):
    wpm: int = 0
    read_percent: int = 0
    reading_time_seconds: int = 0
    quiz_scores: Optional[List[dict]] = []   # [{score, recognized, correct, passed}]
    quiz_average: int = 0                    # 0-100


@router.post("/students/assignments/{assignment_id}/submit-ertak")
async def submit_ertak_assignment(
    assignment_id: str,
    data: ErtakSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ertak vazifasini topshirish — o'qish + savol-javob natijalarini saqlash.
    O'quvchi Olimpiada tizimidagi kabi o'qib, savollarga ovozli javob beradi.
    Natija avtomatik hisoblanadi va submission 'graded' holatiga o'tadi.
    """
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    # Submission mavjudmi?
    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_user_id == current_user.id,
        )
    )
    submission = res.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi yoki sizga berilmagan")
    if submission.status == SubmissionStatus.graded:
        raise HTTPException(status_code=400, detail="Vazifa allaqachon baholangan")

    # Assignment
    a_res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    # Score hisoblash: o'qish (10 ball fixed) + quiz (max_score ga proporsional)
    max_score = assignment.max_score or 100
    reading_points = 10  # har doim 10 ball (o'qish uchun)
    quiz_points = round((data.quiz_average / 100) * (max_score - reading_points)) if data.quiz_average else 0
    total_score = min(reading_points + quiz_points, max_score)

    import json
    summary = {
        "wpm": data.wpm,
        "read_percent": data.read_percent,
        "reading_time_seconds": data.reading_time_seconds,
        "quiz_average": data.quiz_average,
        "quiz_scores": data.quiz_scores or [],
        "reading_points": reading_points,
        "quiz_points": quiz_points,
        "total_score": total_score,
    }

    submission.content = json.dumps(summary, ensure_ascii=False)
    submission.score = total_score
    submission.status = SubmissionStatus.graded
    submission.submitted_at = datetime.now(timezone.utc)
    submission.graded_at = datetime.now(timezone.utc)
    submission.feedback = (
        f"Ertak o'qish: {data.wpm} so'z/daq, {data.read_percent}% o'qildi. "
        f"Savol-javob: {data.quiz_average}/100. "
        f"Umumiy ball: {total_score}/{max_score}"
    )
    submission.meta_data = {
        "wpm": data.wpm,
        "read_percent": data.read_percent,
        "quiz_average": data.quiz_average,
        "total_score": total_score,
    }

    # O'qituvchiga notification
    student_name = f"{current_user.first_name} {current_user.last_name}".strip()
    await create_notification(
        db, assignment.created_by,
        f"📖 Ertak topshirildi: {assignment.title}",
        f"{student_name} ertakni o'qib bo'ldi. Ball: {total_score}/{max_score}",
        InAppNotifType.submission_received,
        "assignment", assignment_id, current_user.id,
    )

    # Coin + XP mukofot
    coins_earned = 0
    try:
        from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType
        sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
        sp = sp_res.scalars().first()
        if sp:
            sc_res = await db.execute(select(StudentCoin).where(StudentCoin.student_id == sp.id))
            coin = sc_res.scalars().first()
            if not coin:
                coin = StudentCoin(student_id=sp.id, current_balance=0, total_earned=0, total_spent=0, total_withdrawn=0)
                db.add(coin)
                await db.flush()
            # O'qish uchun coin: wpm >= 60 → 10, >= 40 → 5, else 2
            reading_coin = 10 if data.wpm >= 60 else 5 if data.wpm >= 40 else 2
            # Quiz uchun coin: average >= 80 → 15, >= 50 → 8, else 3
            quiz_coin = 15 if data.quiz_average >= 80 else 8 if data.quiz_average >= 50 else 3
            bonus = reading_coin + quiz_coin
            coin.add_coins(bonus)
            db.add(CoinTransaction(
                student_coin_id=coin.id,
                type=TransactionType.assignment_complete,
                amount=bonus,
                description=f"Ertak vazifa bajarildi: {assignment.title}",
                reference_id=assignment_id,
                reference_type="assignment",
            ))
            coins_earned = bonus

            # Gamification: XP & Streak
            from app.services.gamification_service import GamificationService
            xp_amount = 80 + int(data.quiz_average * 0.5)
            await GamificationService.add_xp(db, sp.id, xp_amount)
            await GamificationService.update_daily_streak(db, sp.id)
    except Exception as e:
        logger.warning(f"Ertak gamification failed for {current_user.id}: {e}")

    # StoryReadingRecord yaratis (Kutubxonaga tushishi uchun)
    try:
        if assignment.reference_type == 'ertak' and assignment.reference_id:
            # Check if record already exists
            exist_rec = await db.execute(
                select(StoryReadingRecord).where(
                    StoryReadingRecord.student_user_id == current_user.id,
                    StoryReadingRecord.story_id == assignment.reference_id
                )
            )
            if not exist_rec.scalars().first():
                db.add(StoryReadingRecord(
                    student_user_id=current_user.id,
                    story_id=assignment.reference_id,
                    wpm=data.wpm,
                    quiz_score=data.quiz_average
                ))
    except Exception as e:
        logger.warning(f"Failed to create StoryReadingRecord in assignment: {e}")

    await db.commit()

    return {
        "success": True,
        "message": f"Ertak vazifasi topshirildi! Ball: {total_score}/{max_score}",
        "data": {
            "score": total_score,
            "max_score": max_score,
            "wpm": data.wpm,
            "read_percent": data.read_percent,
            "quiz_average": data.quiz_average,
            "coins_earned": coins_earned,
        }
    }


# ============================================================
# PARENT: CHILD ASSIGNMENTS & ASSIGN TASK
# ============================================================

@router.get("/parents/children/{child_user_id}/assignments")
async def parent_child_assignments(
    child_user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ota-ona bolasining vazifalarini ko'radi"""
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    # Bola ota-onaga tegishlimi?
    from shared.database.models import ParentProfile
    parent_res = await db.execute(
        select(ParentProfile).where(ParentProfile.user_id == current_user.id)
    )
    parent = parent_res.scalars().first()
    if not parent:
        raise HTTPException(status_code=404, detail="Ota-ona profili topilmadi")

    # Bola mavjudmi?
    child_res = await db.execute(select(User).where(User.id == child_user_id))
    child = child_res.scalars().first()
    if not child:
        raise HTTPException(status_code=404, detail="Bola topilmadi")

    # Bolaning vazifalari
    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.student_user_id == child_user_id
        ).order_by(AssignmentSubmission.created_at.desc())
    )
    submissions = res.scalars().all()

    result = []
    for s in submissions:
        a_res = await db.execute(select(Assignment).where(Assignment.id == s.assignment_id))
        a = a_res.scalars().first()
        if a:
            t_res = await db.execute(select(User).where(User.id == a.created_by))
            t = t_res.scalars().first()
            result.append({
                **submission_dict(s),
                "assignment": assignment_dict(a),
                "teacher_name": f"{t.first_name} {t.last_name}".strip() if t else None,
            })

    return {"success": True, "data": {
        "child": {"id": child.id, "first_name": child.first_name, "last_name": child.last_name},
        "assignments": result,
        "total": len(result),
    }}


@router.get("/parents/assignments/{assignment_id}")
async def parent_assignment_detail(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ota-ona vazifa tafsilotlarini ko'radi (o'zi bergan yoki bolasiga berilgan)"""
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    subs_res = await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == assignment_id)
    )
    submissions = []
    for s in subs_res.scalars().all():
        sd = submission_dict(s)
        u_res = await db.execute(select(User).where(User.id == s.student_user_id))
        u = u_res.scalars().first()
        if u:
            sd["student_name"] = f"{u.first_name} {u.last_name}".strip()
        submissions.append(sd)

    return {
        "success": True,
        "data": {
            "assignment": assignment_dict(assignment),
            "submissions": submissions,
        }
    }


@router.post("/parents/assignments/{assignment_id}/grade/{submission_id}")
async def parent_grade_submission(
    assignment_id: str, submission_id: str, data: GradeSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ota-ona o'zi bergan vazifani baholaydi"""
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    # Faqat o'zi bergan vazifani baholashi mumkin
    a_res = await db.execute(
        select(Assignment).where(
            Assignment.id == assignment_id,
            Assignment.created_by == current_user.id,
        )
    )
    assignment = a_res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi yoki siz yaratmagansiz")

    res = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.id == submission_id,
            AssignmentSubmission.assignment_id == assignment_id,
        )
    )
    submission = res.scalars().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Topshiruv topilmadi")

    submission.score = data.score
    submission.feedback = data.feedback
    submission.status = SubmissionStatus.graded
    submission.graded_at = datetime.now(timezone.utc)
    submission.graded_by = current_user.id

    await create_notification(
        db, submission.student_user_id,
        f"Vazifa baholandi: {assignment.title}",
        f"Sizning vazifangiz baholandi. Ball: {data.score}/{assignment.max_score}",
        InAppNotifType.assignment_graded,
        "assignment", assignment_id, current_user.id,
    )

    await db.commit()
    return {"success": True, "data": {"submission": submission_dict(submission)}}


@router.post("/parents/assign")
async def parent_assign_task(
    data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ota-ona bolasiga vazifa beradi"""
    if current_user.role != UserRole.parent:
        raise HTTPException(status_code=403, detail="Faqat ota-onalar uchun")

    if not data.target_student_ids:
        raise HTTPException(status_code=400, detail="target_student_ids kerak (bola ID lari)")

    try:
        a_type = AssignmentType(data.assignment_type)
    except ValueError:
        a_type = AssignmentType.homework

    assignment = Assignment(
        created_by=current_user.id,
        creator_role=AssignmentCreatorRole.parent,
        title=data.title,
        description=data.description,
        assignment_type=a_type,
        content=data.content,
        attachments=data.attachments,
        reference_id=data.reference_id,
        reference_type=data.reference_type,
        max_score=data.max_score,
        due_date=data.due_date,
        is_published=True,
    )
    db.add(assignment)
    await db.flush()

    parent_name = f"{current_user.first_name} {current_user.last_name}".strip()
    due_text = data.due_date.strftime("%d.%m.%Y %H:%M") if data.due_date else "Belgilanmagan"

    for sid in data.target_student_ids:
        db.add(AssignmentTarget(
            assignment_id=assignment.id,
            target_type=AssignmentTargetType.student,
            target_id=sid,
        ))
        db.add(AssignmentSubmission(
            assignment_id=assignment.id,
            student_user_id=sid,
            status=SubmissionStatus.pending,
        ))
        await create_notification(
            db, sid,
            f"📝 Ota-onangizdan vazifa: {data.title}",
            f"{parent_name} sizga vazifa berdi. Muddati: {due_text}",
            InAppNotifType.parent_task,
            "assignment", assignment.id, current_user.id,
        )

    await db.commit()
    await db.refresh(assignment)

    for sid in data.target_student_ids:
        tg_text = (
            f"📝 *Ota-onangizdan vazifa!*\n\n"
            f"*{data.title}*\n"
            f"Muddati: {due_text}\n\n"
            f"Platformaga kiring va vazifani bajaring."
        )
        await notify_telegram(db, sid, tg_text)

    return {
        "success": True,
        "data": {"assignment": assignment_dict(assignment), "assigned_to": len(data.target_student_ids)},
    }


# ============================================================
# GRADEBOOK DETAIL REPORT
# ============================================================

@router.get("/teachers/assignments/{assignment_id}/report")
async def get_assignment_report(
    assignment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Detailed results for a specific assignment (Table 2 in Gradebook).
    Returns breakdown: correct count, incorrect, time, rank, etc.
    """
    # 1. Fetch assignment
    a_res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = a_res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    # 2. Fetch submissions
    sub_stmt = (
        select(AssignmentSubmission)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.score.desc(), AssignmentSubmission.submitted_at.asc())
    )
    sub_res = await db.execute(sub_stmt)
    submissions = sub_res.scalars().all()

    # 3. Process results with Ranks
    results = []
    # Rank is simply the index + 1 in the sorted list (since we sorted by score DESC)
    for i, s in enumerate(submissions):
        u_res = await db.execute(select(User).where(User.id == s.student_user_id))
        user = u_res.scalars().first()
        
        meta = s.meta_data or {}
        
        results.append({
            "student_id": s.student_user_id,
            "student_first_name": user.first_name if user else "O'quvchi",
            "student_last_name": user.last_name if user else "",
            "correct_count": meta.get("correct", 0),
            "total_questions": meta.get("total", 0),
            "incorrect_count": meta.get("total", 0) - meta.get("correct", 0),
            "time_spent_seconds": meta.get("time_spent_seconds", 0),
            "score": s.score,
            "status": s.status.value,
            "rank": i + 1 if s.status == SubmissionStatus.graded else None,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None
        })

    return {
        "success": True,
        "data": {
            "assignment": {
                "id": assignment.id,
                "title": assignment.title,
                "type": assignment.assignment_type.value,
                "max_score": assignment.max_score
            },
            "results": results
        }
    }
