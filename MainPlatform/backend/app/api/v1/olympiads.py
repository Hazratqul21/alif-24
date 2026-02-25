"""
Olympiad Router - Olimpiada tizimi (MainPlatform)
/api/v1/olympiads/...

Imkoniyatlar:
- Admin: Olimpiada CRUD, savollar, o'qish vazifalari, monitoring, baholash
- Leaderboard, statistika

NOTE: Student-facing endpoints (register, start, submit, etc.) are on
olimp.alif24.uz (Olimp Platform, port 8005) to handle high load separately.
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc
from pydantic import BaseModel, Field
from typing import Dict, Any

from shared.database import get_db
from shared.database.models import (
    User, UserRole,
    StudentProfile,
    OlympiadType, OlympiadStatus, OlympiadSubject, ParticipationStatus,
    Olympiad, OlympiadQuestion, OlympiadParticipant, OlympiadAnswer,
    OlympiadReadingTask, OlympiadReadingSubmission,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# ADMIN AUTH (same as admin_panel.py)
# ============================================================================

ADMIN_KEYS = {
    "hazratqul": "alif24_rahbariyat26!",
    "nurali": "alif24_rahbariyat26!",
    "pedagog": "alif24_rahbariyat26!",
}

async def verify_admin_olympiad(
    x_admin_role: str = Header(..., alias="X-Admin-Role"),
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
) -> Dict[str, Any]:
    role = x_admin_role.lower()
    if role not in ADMIN_KEYS or x_admin_key != ADMIN_KEYS.get(role):
        raise HTTPException(status_code=403, detail="Admin authentication failed")
    return {"role": role}


def olympiad_to_dict(o: Olympiad, participant_count: int = 0) -> dict:
    return {
        "id": o.id,
        "title": o.title,
        "description": o.description,
        "subject": o.subject.value if o.subject else "general",
        "type": o.type.value if o.type else "test",
        "min_age": o.min_age,
        "max_age": o.max_age,
        "grade_level": o.grade_level,
        "registration_start": o.registration_start.isoformat() if o.registration_start else None,
        "registration_end": o.registration_end.isoformat() if o.registration_end else None,
        "start_time": o.start_time.isoformat() if o.start_time else None,
        "end_time": o.end_time.isoformat() if o.end_time else None,
        "duration_minutes": o.duration_minutes,
        "max_participants": o.max_participants,
        "questions_count": o.questions_count,
        "status": o.status.value if o.status else "draft",
        "results_public": o.results_public,
        "created_by": o.created_by,
        "participant_count": participant_count,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def question_to_dict(q: OlympiadQuestion, hide_answer: bool = False) -> dict:
    d = {
        "id": q.id,
        "question_text": q.question_text,
        "question_image": q.question_image,
        "options": q.options,
        "points": q.points,
        "order": q.order,
    }
    if not hide_answer:
        d["correct_answer"] = q.correct_answer
    return d


def reading_task_to_dict(rt: OlympiadReadingTask, hide_answers: bool = False) -> dict:
    d = {
        "id": rt.id,
        "title": rt.title,
        "text_content": rt.text_content,
        "word_count": rt.word_count,
        "difficulty": rt.difficulty,
        "order": rt.order,
        "time_limit_seconds": rt.time_limit_seconds,
    }
    if not hide_answers and rt.comprehension_questions:
        d["comprehension_questions"] = rt.comprehension_questions
    elif rt.comprehension_questions:
        # Hide correct answers from students
        d["comprehension_questions"] = [
            {"question": cq.get("question"), "options": cq.get("options")}
            for cq in (rt.comprehension_questions or [])
        ]
    return d


# ============================================================================
# SCHEMAS
# ============================================================================

class OlympiadCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: Optional[str] = None
    subject: str = "general"
    type: str = "test"  # test, reading, mixed
    min_age: int = 4
    max_age: int = 18
    grade_level: Optional[str] = None
    registration_start: datetime
    registration_end: datetime
    start_time: datetime
    end_time: datetime
    duration_minutes: int = 30
    max_participants: int = 500
    questions_count: int = 20
    results_public: bool = True


class OlympiadUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    type: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    grade_level: Optional[str] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    max_participants: Optional[int] = None
    questions_count: Optional[int] = None
    results_public: Optional[bool] = None
    status: Optional[str] = None


class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=3)
    question_image: Optional[str] = None
    options: List[str] = Field(..., min_length=2, max_length=6)
    correct_answer: int = Field(..., ge=0)
    points: int = Field(default=5, ge=1, le=100)


class ReadingTaskCreate(BaseModel):
    title: str = Field(..., min_length=3)
    text_content: str = Field(..., min_length=10)
    difficulty: str = "medium"
    time_limit_seconds: int = 300
    comprehension_questions: Optional[List[dict]] = None


class GradeReading(BaseModel):
    pronunciation_score: int = Field(..., ge=0, le=10)
    fluency_score: int = Field(..., ge=0, le=10)
    accuracy_score: int = Field(..., ge=0, le=10)
    notes: Optional[str] = None


# ============================================================================
# ADMIN: OLYMPIAD CRUD
# ============================================================================

@router.post("")
async def create_olympiad(
    data: OlympiadCreate,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Create a new olympiad (admin only)"""
    olympiad = Olympiad(
        title=data.title,
        description=data.description,
        subject=OlympiadSubject(data.subject) if data.subject in [e.value for e in OlympiadSubject] else OlympiadSubject.general,
        type=OlympiadType(data.type) if data.type in [e.value for e in OlympiadType] else OlympiadType.test,
        min_age=data.min_age,
        max_age=data.max_age,
        grade_level=data.grade_level,
        registration_start=data.registration_start,
        registration_end=data.registration_end,
        start_time=data.start_time,
        end_time=data.end_time,
        duration_minutes=data.duration_minutes,
        max_participants=data.max_participants,
        questions_count=data.questions_count,
        results_public=data.results_public,
        status=OlympiadStatus.draft,
        created_by=None,
    )
    db.add(olympiad)
    await db.commit()
    await db.refresh(olympiad)

    return {"success": True, "olympiad": olympiad_to_dict(olympiad), "message": "Olimpiada yaratildi"}


@router.get("")
async def list_olympiads(
    status: Optional[str] = None,
    type: Optional[str] = None,
    subject: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """List olympiads (admin only)"""
    base = select(Olympiad)

    if status:
        base = base.where(Olympiad.status == OlympiadStatus(status))
    if type:
        base = base.where(Olympiad.type == OlympiadType(type))
    if subject:
        base = base.where(Olympiad.subject == OlympiadSubject(subject))
    if search:
        base = base.where(Olympiad.title.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0

    result = await db.execute(base.order_by(desc(Olympiad.created_at)).offset(offset).limit(limit))
    olympiads = result.scalars().all()

    items = []
    for o in olympiads:
        pc = await db.scalar(
            select(func.count(OlympiadParticipant.id)).where(OlympiadParticipant.olympiad_id == o.id)
        ) or 0
        items.append(olympiad_to_dict(o, pc))

    return {"success": True, "olympiads": items, "total": total}


@router.get("/{olympiad_id}")
async def get_olympiad(
    olympiad_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Get olympiad details (admin only)"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    o = res.scalars().first()
    if not o:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    pc = await db.scalar(
        select(func.count(OlympiadParticipant.id)).where(OlympiadParticipant.olympiad_id == o.id)
    ) or 0

    data = olympiad_to_dict(o, pc)
    return {"success": True, "olympiad": data}


@router.put("/{olympiad_id}")
async def update_olympiad(
    olympiad_id: str,
    data: OlympiadUpdate,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Update olympiad (admin only)"""

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    o = res.scalars().first()
    if not o:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "subject" and value:
            value = OlympiadSubject(value) if value in [e.value for e in OlympiadSubject] else o.subject
        elif field == "type" and value:
            value = OlympiadType(value) if value in [e.value for e in OlympiadType] else o.type
        elif field == "status" and value:
            value = OlympiadStatus(value) if value in [e.value for e in OlympiadStatus] else o.status
        setattr(o, field, value)

    await db.commit()
    return {"success": True, "message": "Olimpiada yangilandi"}


@router.delete("/{olympiad_id}")
async def delete_olympiad(
    olympiad_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Delete olympiad (admin only)"""

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    o = res.scalars().first()
    if not o:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    await db.delete(o)
    await db.commit()
    return {"success": True, "message": "Olimpiada o'chirildi"}


# ============================================================================
# ADMIN: QUESTIONS MANAGEMENT
# ============================================================================

@router.post("/{olympiad_id}/questions")
async def add_question(
    olympiad_id: str,
    data: QuestionCreate,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Add test question to olympiad (admin only)"""

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    o = res.scalars().first()
    if not o:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    if data.correct_answer >= len(data.options):
        raise HTTPException(status_code=400, detail="correct_answer options sonidan katta")

    current_count = await db.scalar(
        select(func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == o.id)
    ) or 0

    q = OlympiadQuestion(
        olympiad_id=o.id,
        question_text=data.question_text,
        question_image=data.question_image,
        options=data.options,
        correct_answer=data.correct_answer,
        points=data.points,
        order=current_count,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)

    return {"success": True, "question": question_to_dict(q), "message": "Savol qo'shildi"}


@router.get("/{olympiad_id}/questions")
async def list_questions(
    olympiad_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """List questions (admin only)"""
    hide_answer = False

    result = await db.execute(
        select(OlympiadQuestion)
        .where(OlympiadQuestion.olympiad_id == olympiad_id)
        .order_by(asc(OlympiadQuestion.order))
    )
    questions = result.scalars().all()

    return {
        "success": True,
        "questions": [question_to_dict(q, hide_answer) for q in questions],
        "total": len(questions),
    }


@router.delete("/{olympiad_id}/questions/{question_id}")
async def delete_question(
    olympiad_id: str,
    question_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Delete question (admin only)"""

    res = await db.execute(
        select(OlympiadQuestion).where(
            OlympiadQuestion.id == question_id,
            OlympiadQuestion.olympiad_id == olympiad_id
        )
    )
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")

    await db.delete(q)
    await db.commit()
    return {"success": True, "message": "Savol o'chirildi"}


# ============================================================================
# ADMIN: READING TASKS
# ============================================================================

@router.post("/{olympiad_id}/reading-tasks")
async def add_reading_task(
    olympiad_id: str,
    data: ReadingTaskCreate,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Add reading task to olympiad (admin only)"""

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    o = res.scalars().first()
    if not o:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    if o.type == OlympiadType.test:
        raise HTTPException(status_code=400, detail="Bu test turi olimpiada — o'qish vazifasi qo'shib bo'lmaydi")

    word_count = len(data.text_content.split())

    current_count = await db.scalar(
        select(func.count(OlympiadReadingTask.id)).where(OlympiadReadingTask.olympiad_id == o.id)
    ) or 0

    rt = OlympiadReadingTask(
        olympiad_id=o.id,
        title=data.title,
        text_content=data.text_content,
        word_count=word_count,
        difficulty=data.difficulty,
        time_limit_seconds=data.time_limit_seconds,
        comprehension_questions=data.comprehension_questions,
        order=current_count,
    )
    db.add(rt)
    await db.commit()
    await db.refresh(rt)

    return {"success": True, "reading_task": reading_task_to_dict(rt), "message": "O'qish vazifasi qo'shildi"}


@router.get("/{olympiad_id}/reading-tasks")
async def list_reading_tasks(
    olympiad_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """List reading tasks (admin only)"""
    hide_answers = False

    result = await db.execute(
        select(OlympiadReadingTask)
        .where(OlympiadReadingTask.olympiad_id == olympiad_id)
        .order_by(asc(OlympiadReadingTask.order))
    )
    tasks = result.scalars().all()

    return {
        "success": True,
        "reading_tasks": [reading_task_to_dict(rt, hide_answers) for rt in tasks],
        "total": len(tasks),
    }


@router.delete("/{olympiad_id}/reading-tasks/{task_id}")
async def delete_reading_task(
    olympiad_id: str,
    task_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Delete reading task (admin only)"""

    res = await db.execute(
        select(OlympiadReadingTask).where(
            OlympiadReadingTask.id == task_id,
            OlympiadReadingTask.olympiad_id == olympiad_id
        )
    )
    rt = res.scalars().first()
    if not rt:
        raise HTTPException(status_code=404, detail="Vazifa topilmadi")

    await db.delete(rt)
    await db.commit()
    return {"success": True, "message": "O'qish vazifasi o'chirildi"}


    # NOTE: Student-facing endpoints (register, start, submit-test, submit-reading,
    # complete, my-result, upload-audio) are handled by the separate Olimp platform
    # at olimp.alif24.uz (port 8005) to avoid load on MainPlatform.


# ============================================================================
# LEADERBOARD & RESULTS
# ============================================================================

@router.get("/{olympiad_id}/leaderboard")
async def get_leaderboard(
    olympiad_id: str,
    limit: int = Query(50, ge=1, le=200),
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Get olympiad leaderboard (admin only)"""
    res = await db.execute(
        select(OlympiadParticipant, StudentProfile, User)
        .join(StudentProfile, OlympiadParticipant.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.status == ParticipationStatus.completed
        )
        .order_by(desc(OlympiadParticipant.total_score), asc(OlympiadParticipant.time_spent_seconds))
        .limit(limit)
    )
    rows = res.all()

    leaderboard = []
    for rank, (p, sp, u) in enumerate(rows, 1):
        entry = {
            "rank": rank,
            "student_name": f"{u.first_name} {u.last_name}",
            "student_id": sp.id,
            "grade": sp.grade,
            "total_score": p.total_score,
            "correct_answers": p.correct_answers,
            "time_spent_seconds": p.time_spent_seconds,
            "coins_earned": p.coins_earned,
        }

        # Get reading WPM if exists
        wpm_res = await db.scalar(
            select(func.avg(OlympiadReadingSubmission.words_per_minute)).where(
                OlympiadReadingSubmission.participant_id == p.id
            )
        )
        if wpm_res:
            entry["avg_wpm"] = round(wpm_res, 1)

        # Get admin reading score if exists
        admin_score = await db.scalar(
            select(func.sum(OlympiadReadingSubmission.admin_total_score)).where(
                OlympiadReadingSubmission.participant_id == p.id,
                OlympiadReadingSubmission.admin_total_score.isnot(None)
            )
        )
        if admin_score:
            entry["admin_reading_score"] = admin_score

        leaderboard.append(entry)

    return {"success": True, "leaderboard": leaderboard, "total": len(leaderboard)}


# ============================================================================
# ADMIN: MONITORING & GRADING
# ============================================================================

@router.get("/{olympiad_id}/participants")
async def list_participants(
    olympiad_id: str,
    status: Optional[str] = None,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """List all participants (admin only)"""

    base = (
        select(OlympiadParticipant, StudentProfile, User)
        .join(StudentProfile, OlympiadParticipant.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .where(OlympiadParticipant.olympiad_id == olympiad_id)
    )

    if status:
        base = base.where(OlympiadParticipant.status == ParticipationStatus(status))

    result = await db.execute(base.order_by(desc(OlympiadParticipant.registered_at)))
    rows = result.all()

    participants = []
    for p, sp, u in rows:
        entry = {
            "participant_id": p.id,
            "student_id": sp.id,
            "student_name": f"{u.first_name} {u.last_name}",
            "grade": sp.grade,
            "status": p.status.value,
            "total_score": p.total_score,
            "correct_answers": p.correct_answers,
            "time_spent_seconds": p.time_spent_seconds,
            "registered_at": p.registered_at.isoformat() if p.registered_at else None,
            "started_at": p.started_at.isoformat() if p.started_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }

        # Check if has ungraded reading submissions
        ungraded = await db.scalar(
            select(func.count(OlympiadReadingSubmission.id)).where(
                OlympiadReadingSubmission.participant_id == p.id,
                OlympiadReadingSubmission.admin_total_score.is_(None)
            )
        ) or 0
        entry["ungraded_readings"] = ungraded

        participants.append(entry)

    return {"success": True, "participants": participants, "total": len(participants)}


@router.get("/{olympiad_id}/reading-submissions")
async def list_reading_submissions(
    olympiad_id: str,
    ungraded_only: bool = False,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """List reading submissions for grading (admin only)"""

    base = (
        select(OlympiadReadingSubmission, OlympiadParticipant, StudentProfile, User, OlympiadReadingTask)
        .join(OlympiadParticipant, OlympiadReadingSubmission.participant_id == OlympiadParticipant.id)
        .join(StudentProfile, OlympiadParticipant.student_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .join(OlympiadReadingTask, OlympiadReadingSubmission.reading_task_id == OlympiadReadingTask.id)
        .where(OlympiadParticipant.olympiad_id == olympiad_id)
    )

    if ungraded_only:
        base = base.where(OlympiadReadingSubmission.admin_total_score.is_(None))

    result = await db.execute(base.order_by(desc(OlympiadReadingSubmission.submitted_at)))
    rows = result.all()

    submissions = []
    for sub, p, sp, u, rt in rows:
        submissions.append({
            "submission_id": sub.id,
            "participant_id": p.id,
            "student_name": f"{u.first_name} {u.last_name}",
            "grade": sp.grade,
            "reading_task_title": rt.title,
            "reading_task_word_count": rt.word_count,
            "audio_url": sub.audio_url,
            "words_per_minute": sub.words_per_minute,
            "reading_duration_seconds": sub.reading_duration_seconds,
            "comprehension_score": sub.comprehension_score,
            "comprehension_total": sub.comprehension_total,
            "admin_pronunciation_score": sub.admin_pronunciation_score,
            "admin_fluency_score": sub.admin_fluency_score,
            "admin_accuracy_score": sub.admin_accuracy_score,
            "admin_total_score": sub.admin_total_score,
            "admin_notes": sub.admin_notes,
            "graded": sub.admin_total_score is not None,
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
        })

    return {"success": True, "submissions": submissions, "total": len(submissions)}


@router.post("/reading-submissions/{submission_id}/grade")
async def grade_reading_submission(
    submission_id: str,
    data: GradeReading,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Grade a reading submission (admin only)"""

    res = await db.execute(
        select(OlympiadReadingSubmission).where(OlympiadReadingSubmission.id == submission_id)
    )
    sub = res.scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission topilmadi")

    sub.admin_pronunciation_score = data.pronunciation_score
    sub.admin_fluency_score = data.fluency_score
    sub.admin_accuracy_score = data.accuracy_score
    sub.admin_total_score = data.pronunciation_score + data.fluency_score + data.accuracy_score
    sub.admin_notes = data.notes
    sub.graded_by = admin["role"]
    sub.graded_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "success": True,
        "message": "Baholandi!",
        "admin_total_score": sub.admin_total_score,
    }


# ============================================================================
# ADMIN: STATS
# ============================================================================

@router.get("/{olympiad_id}/stats")
async def get_olympiad_stats(
    olympiad_id: str,
    admin: Dict = Depends(verify_admin_olympiad),
    db: AsyncSession = Depends(get_db),
):
    """Get olympiad statistics (admin only)"""

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    o = res.scalars().first()
    if not o:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    total_participants = await db.scalar(
        select(func.count(OlympiadParticipant.id)).where(OlympiadParticipant.olympiad_id == o.id)
    ) or 0

    completed = await db.scalar(
        select(func.count(OlympiadParticipant.id)).where(
            OlympiadParticipant.olympiad_id == o.id,
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    ) or 0

    started = await db.scalar(
        select(func.count(OlympiadParticipant.id)).where(
            OlympiadParticipant.olympiad_id == o.id,
            OlympiadParticipant.status == ParticipationStatus.started
        )
    ) or 0

    avg_score = await db.scalar(
        select(func.avg(OlympiadParticipant.total_score)).where(
            OlympiadParticipant.olympiad_id == o.id,
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    )

    avg_time = await db.scalar(
        select(func.avg(OlympiadParticipant.time_spent_seconds)).where(
            OlympiadParticipant.olympiad_id == o.id,
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    )

    questions_count = await db.scalar(
        select(func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == o.id)
    ) or 0

    reading_tasks_count = await db.scalar(
        select(func.count(OlympiadReadingTask.id)).where(OlympiadReadingTask.olympiad_id == o.id)
    ) or 0

    ungraded_readings = await db.scalar(
        select(func.count(OlympiadReadingSubmission.id))
        .join(OlympiadParticipant, OlympiadReadingSubmission.participant_id == OlympiadParticipant.id)
        .where(
            OlympiadParticipant.olympiad_id == o.id,
            OlympiadReadingSubmission.admin_total_score.is_(None)
        )
    ) or 0

    avg_wpm = await db.scalar(
        select(func.avg(OlympiadReadingSubmission.words_per_minute))
        .join(OlympiadParticipant, OlympiadReadingSubmission.participant_id == OlympiadParticipant.id)
        .where(OlympiadParticipant.olympiad_id == o.id)
    )

    return {
        "success": True,
        "stats": {
            "total_participants": total_participants,
            "completed": completed,
            "in_progress": started,
            "registered_only": total_participants - completed - started,
            "avg_score": round(avg_score, 1) if avg_score else 0,
            "avg_time_seconds": round(avg_time) if avg_time else 0,
            "questions_count": questions_count,
            "reading_tasks_count": reading_tasks_count,
            "ungraded_readings": ungraded_readings,
            "avg_wpm": round(avg_wpm, 1) if avg_wpm else 0,
        }
    }


    # NOTE: Audio upload endpoint is on olimp.alif24.uz (port 8005)
