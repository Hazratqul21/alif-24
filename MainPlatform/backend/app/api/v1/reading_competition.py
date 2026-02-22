"""
Reading Competition Admin Router
Haftalik O'qish Musobaqasi — Admin CRUD

Endpoints:
- CRUD competitions (musobaqalar)
- CRUD tasks (kunlik hikoyalar)
- CRUD tests (shanba test)
- Natijalar ko'rish
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, date

from shared.database import get_db
from shared.database.models.reading_competition import (
    ReadingCompetition, ReadingTask, CompetitionTest,
    ReadingSession, CompetitionResult,
    CompetitionStatus, TaskDay, SessionStatus, ResultGroup,
)
from app.api.v1.admin_panel import verify_admin, has_permission

router = APIRouter(tags=["reading-competition"])


# ============================================================
# SCHEMAS
# ============================================================

class CompetitionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    week_number: int = Field(..., ge=1, le=53)
    year: int = Field(..., ge=2024, le=2030)
    grade_level: Optional[str] = None
    language: str = "uz"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CompetitionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    grade_level: Optional[str] = None
    language: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class TaskCreate(BaseModel):
    day_of_week: str = Field(..., pattern="^(monday|tuesday|wednesday|thursday|friday)$")
    title: str
    image_url: Optional[str] = None
    story_text: str
    questions: Optional[List[Dict[str, Any]]] = None
    time_limit_seconds: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    story_text: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None
    time_limit_seconds: Optional[int] = None

class TestCreate(BaseModel):
    title: Optional[str] = None
    questions: List[Dict[str, Any]]
    time_limit_minutes: int = 30

class TestUpdate(BaseModel):
    title: Optional[str] = None
    questions: Optional[List[Dict[str, Any]]] = None
    time_limit_minutes: Optional[int] = None


def _count_words(text: str) -> int:
    """Matndagi so'zlar sonini hisoblash"""
    if not text:
        return 0
    return len(text.split())


def _serialize_competition(c: ReadingCompetition, tasks_count: int = 0, participants: int = 0) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "week_number": c.week_number,
        "year": c.year,
        "grade_level": c.grade_level,
        "language": c.language,
        "status": c.status.value if c.status else "draft",
        "start_date": c.start_date.isoformat() if c.start_date else None,
        "end_date": c.end_date.isoformat() if c.end_date else None,
        "created_by": c.created_by,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "tasks_count": tasks_count,
        "participants": participants,
    }


def _serialize_task(t: ReadingTask) -> dict:
    return {
        "id": t.id,
        "competition_id": t.competition_id,
        "day_of_week": t.day_of_week.value if t.day_of_week else None,
        "title": t.title,
        "image_url": t.image_url,
        "story_text": t.story_text,
        "total_words": t.total_words,
        "questions": t.questions,
        "questions_count": len(t.questions) if t.questions else 0,
        "time_limit_seconds": t.time_limit_seconds,
        "order_index": t.order_index,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _serialize_test(t: CompetitionTest) -> dict:
    return {
        "id": t.id,
        "competition_id": t.competition_id,
        "title": t.title,
        "questions": t.questions,
        "questions_count": len(t.questions) if t.questions else 0,
        "time_limit_minutes": t.time_limit_minutes,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


# ============================================================
# COMPETITIONS CRUD
# ============================================================

@router.get("/competitions")
async def list_competitions(
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
    year: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Barcha musobaqalar ro'yxati"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    stmt = select(ReadingCompetition).order_by(ReadingCompetition.created_at.desc())
    count_stmt = select(func.count(ReadingCompetition.id))

    if status:
        stmt = stmt.where(ReadingCompetition.status == status)
        count_stmt = count_stmt.where(ReadingCompetition.status == status)
    if year:
        stmt = stmt.where(ReadingCompetition.year == year)
        count_stmt = count_stmt.where(ReadingCompetition.year == year)

    total = (await db.execute(count_stmt)).scalar() or 0
    result = await db.execute(stmt.offset(offset).limit(limit))
    competitions = result.scalars().all()

    items = []
    for c in competitions:
        tasks_count = (await db.execute(
            select(func.count(ReadingTask.id)).where(ReadingTask.competition_id == c.id)
        )).scalar() or 0
        participants = (await db.execute(
            select(func.count(func.distinct(ReadingSession.student_id))).where(ReadingSession.competition_id == c.id)
        )).scalar() or 0
        items.append(_serialize_competition(c, tasks_count, participants))

    return {"total": total, "competitions": items}


@router.post("/competitions")
async def create_competition(
    data: CompetitionCreate,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Yangi musobaqa yaratish"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    comp = ReadingCompetition(
        title=data.title,
        description=data.description,
        week_number=data.week_number,
        year=data.year,
        grade_level=data.grade_level,
        language=data.language,
        created_by=admin["role"],
    )
    if data.start_date:
        comp.start_date = date.fromisoformat(data.start_date)
    if data.end_date:
        comp.end_date = date.fromisoformat(data.end_date)

    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    return {"message": "Musobaqa yaratildi", "competition": _serialize_competition(comp)}


@router.get("/competitions/{comp_id}")
async def get_competition(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqa tafsilotlari — hikoyalar va test bilan"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(select(ReadingCompetition).where(ReadingCompetition.id == comp_id))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    # Tasks
    tasks_res = await db.execute(
        select(ReadingTask).where(ReadingTask.competition_id == comp_id).order_by(ReadingTask.order_index)
    )
    tasks = [_serialize_task(t) for t in tasks_res.scalars().all()]

    # Test
    test_res = await db.execute(
        select(CompetitionTest).where(CompetitionTest.competition_id == comp_id)
    )
    test_obj = test_res.scalar_one_or_none()
    test = _serialize_test(test_obj) if test_obj else None

    # Participants count
    participants = (await db.execute(
        select(func.count(func.distinct(ReadingSession.student_id))).where(ReadingSession.competition_id == comp_id)
    )).scalar() or 0

    comp_data = _serialize_competition(comp, len(tasks), participants)
    comp_data["tasks"] = tasks
    comp_data["test"] = test

    return comp_data


@router.put("/competitions/{comp_id}")
async def update_competition(
    comp_id: str,
    data: CompetitionUpdate,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqani yangilash"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(select(ReadingCompetition).where(ReadingCompetition.id == comp_id))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    if data.title is not None:
        comp.title = data.title
    if data.description is not None:
        comp.description = data.description
    if data.grade_level is not None:
        comp.grade_level = data.grade_level
    if data.language is not None:
        comp.language = data.language
    if data.status is not None:
        comp.status = CompetitionStatus(data.status)
    if data.start_date is not None:
        comp.start_date = date.fromisoformat(data.start_date) if data.start_date else None
    if data.end_date is not None:
        comp.end_date = date.fromisoformat(data.end_date) if data.end_date else None

    await db.commit()
    return {"message": "Musobaqa yangilandi", "id": comp_id}


@router.delete("/competitions/{comp_id}")
async def delete_competition(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqani o'chirish (cascade — tasks, test, sessions, results ham)"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin o'chira oladi")

    result = await db.execute(select(ReadingCompetition).where(ReadingCompetition.id == comp_id))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    await db.delete(comp)
    await db.commit()
    return {"message": "Musobaqa o'chirildi", "id": comp_id}


# ============================================================
# TASKS (HIKOYALAR) CRUD
# ============================================================

@router.get("/competitions/{comp_id}/tasks")
async def list_tasks(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqaning barcha hikoyalari"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(
        select(ReadingTask).where(ReadingTask.competition_id == comp_id).order_by(ReadingTask.order_index)
    )
    tasks = [_serialize_task(t) for t in result.scalars().all()]
    return {"tasks": tasks, "total": len(tasks)}


@router.post("/competitions/{comp_id}/tasks")
async def create_task(
    comp_id: str,
    data: TaskCreate,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqaga hikoya qo'shish"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    # Competition mavjudligini tekshirish
    comp_res = await db.execute(select(ReadingCompetition).where(ReadingCompetition.id == comp_id))
    if not comp_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    # Shu kun uchun allaqachon hikoya bormi
    existing = await db.execute(
        select(ReadingTask).where(
            ReadingTask.competition_id == comp_id,
            ReadingTask.day_of_week == data.day_of_week
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"{data.day_of_week} kuni uchun hikoya allaqachon mavjud")

    # Day index for ordering
    day_order = {"monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4}

    task = ReadingTask(
        competition_id=comp_id,
        day_of_week=TaskDay(data.day_of_week),
        title=data.title,
        image_url=data.image_url,
        story_text=data.story_text,
        total_words=_count_words(data.story_text),
        questions=data.questions,
        time_limit_seconds=data.time_limit_seconds,
        order_index=day_order.get(data.day_of_week, 0),
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    return {"message": "Hikoya qo'shildi", "task": _serialize_task(task)}


@router.get("/competitions/{comp_id}/tasks/{task_id}")
async def get_task(
    comp_id: str,
    task_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hikoya tafsilotlari"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(
        select(ReadingTask).where(ReadingTask.id == task_id, ReadingTask.competition_id == comp_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Hikoya topilmadi")

    task_data = _serialize_task(task)

    # Session stats for this task
    sessions_count = (await db.execute(
        select(func.count(ReadingSession.id)).where(ReadingSession.task_id == task_id)
    )).scalar() or 0
    avg_score = (await db.execute(
        select(func.avg(ReadingSession.total_score)).where(
            ReadingSession.task_id == task_id,
            ReadingSession.status == SessionStatus.completed
        )
    )).scalar()

    task_data["sessions_count"] = sessions_count
    task_data["avg_score"] = round(avg_score, 1) if avg_score else 0

    return task_data


@router.put("/competitions/{comp_id}/tasks/{task_id}")
async def update_task(
    comp_id: str,
    task_id: str,
    data: TaskUpdate,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hikoyani yangilash"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(
        select(ReadingTask).where(ReadingTask.id == task_id, ReadingTask.competition_id == comp_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Hikoya topilmadi")

    if data.title is not None:
        task.title = data.title
    if data.image_url is not None:
        task.image_url = data.image_url
    if data.story_text is not None:
        task.story_text = data.story_text
        task.total_words = _count_words(data.story_text)
    if data.questions is not None:
        task.questions = data.questions
    if data.time_limit_seconds is not None:
        task.time_limit_seconds = data.time_limit_seconds

    await db.commit()
    return {"message": "Hikoya yangilandi", "id": task_id}


@router.delete("/competitions/{comp_id}/tasks/{task_id}")
async def delete_task(
    comp_id: str,
    task_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Hikoyani o'chirish"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(
        select(ReadingTask).where(ReadingTask.id == task_id, ReadingTask.competition_id == comp_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Hikoya topilmadi")

    await db.delete(task)
    await db.commit()
    return {"message": "Hikoya o'chirildi", "id": task_id}


# ============================================================
# TEST CRUD
# ============================================================

@router.get("/competitions/{comp_id}/test")
async def get_test(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqaning testi"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    result = await db.execute(
        select(CompetitionTest).where(CompetitionTest.competition_id == comp_id)
    )
    test = result.scalar_one_or_none()
    if not test:
        return {"test": None}

    return {"test": _serialize_test(test)}


@router.post("/competitions/{comp_id}/test")
async def create_or_update_test(
    comp_id: str,
    data: TestCreate,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test yaratish yoki yangilash"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    # Competition mavjudligini tekshirish
    comp_res = await db.execute(select(ReadingCompetition).where(ReadingCompetition.id == comp_id))
    if not comp_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    # Mavjud testni tekshirish
    result = await db.execute(
        select(CompetitionTest).where(CompetitionTest.competition_id == comp_id)
    )
    test = result.scalar_one_or_none()

    if test:
        test.title = data.title or test.title
        test.questions = data.questions
        test.time_limit_minutes = data.time_limit_minutes
        message = "Test yangilandi"
    else:
        test = CompetitionTest(
            competition_id=comp_id,
            title=data.title,
            questions=data.questions,
            time_limit_minutes=data.time_limit_minutes,
        )
        db.add(test)
        message = "Test yaratildi"

    await db.commit()
    await db.refresh(test)

    return {"message": message, "test": _serialize_test(test)}


@router.delete("/competitions/{comp_id}/test")
async def delete_test(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Testni o'chirish"""
    if not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Faqat super admin o'chira oladi")

    result = await db.execute(
        select(CompetitionTest).where(CompetitionTest.competition_id == comp_id)
    )
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")

    await db.delete(test)
    await db.commit()
    return {"message": "Test o'chirildi"}


# ============================================================
# RESULTS & STATS (admin ko'rish uchun)
# ============================================================

@router.get("/competitions/{comp_id}/results")
async def get_competition_results(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    group: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Musobaqa natijalari — guruhlar bo'yicha"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    from shared.database.models import User

    stmt = (
        select(CompetitionResult, User)
        .join(User, CompetitionResult.student_id == User.id)
        .where(CompetitionResult.competition_id == comp_id)
    )

    if group:
        stmt = stmt.where(CompetitionResult.group == group)

    stmt = stmt.order_by(CompetitionResult.total_score.desc())

    total_stmt = select(func.count(CompetitionResult.id)).where(CompetitionResult.competition_id == comp_id)
    if group:
        total_stmt = total_stmt.where(CompetitionResult.group == group)
    total = (await db.execute(total_stmt)).scalar() or 0

    result = await db.execute(stmt.offset(offset).limit(limit))
    rows = result.all()

    items = []
    for cr, user in rows:
        items.append({
            "id": cr.id,
            "student_id": cr.student_id,
            "student_name": f"{user.first_name} {user.last_name}",
            "daily_scores": cr.daily_scores,
            "test_score": cr.test_score,
            "test_correct": cr.test_correct,
            "test_total": cr.test_total,
            "total_reading_score": cr.total_reading_score,
            "total_score": cr.total_score,
            "rank_fast": cr.rank_fast,
            "rank_accurate": cr.rank_accurate,
            "rank_test": cr.rank_test,
            "rank_overall": cr.rank_overall,
            "group": cr.group.value if cr.group else None,
        })

    return {"total": total, "results": items}


@router.get("/competitions/{comp_id}/sessions")
async def get_competition_sessions(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
    task_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Musobaqadagi barcha o'qish sessiyalari"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    from shared.database.models import User

    stmt = (
        select(ReadingSession, User)
        .join(User, ReadingSession.student_id == User.id)
        .where(ReadingSession.competition_id == comp_id)
    )

    if task_id:
        stmt = stmt.where(ReadingSession.task_id == task_id)

    stmt = stmt.order_by(ReadingSession.total_score.desc())

    total_stmt = select(func.count(ReadingSession.id)).where(ReadingSession.competition_id == comp_id)
    if task_id:
        total_stmt = total_stmt.where(ReadingSession.task_id == task_id)
    total = (await db.execute(total_stmt)).scalar() or 0

    result = await db.execute(stmt.offset(offset).limit(limit))
    rows = result.all()

    items = []
    for s, user in rows:
        items.append({
            "id": s.id,
            "student_id": s.student_id,
            "student_name": f"{user.first_name} {user.last_name}",
            "task_id": s.task_id,
            "status": s.status.value if s.status else "not_started",
            "reading_time_seconds": s.reading_time_seconds,
            "words_read": s.words_read,
            "total_words": s.total_words,
            "completion_percentage": s.completion_percentage,
            "questions_correct": s.questions_correct,
            "questions_total": s.questions_total,
            "score_completion": s.score_completion,
            "score_words": s.score_words,
            "score_time": s.score_time,
            "score_questions": s.score_questions,
            "total_score": s.total_score,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        })

    return {"total": total, "sessions": items}


@router.get("/competitions/{comp_id}/stats")
async def get_competition_stats(
    comp_id: str,
    admin: Dict = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
):
    """Musobaqa statistikasi"""
    if not has_permission(admin, "content") and not has_permission(admin, "all"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")

    # Competition
    comp_res = await db.execute(select(ReadingCompetition).where(ReadingCompetition.id == comp_id))
    comp = comp_res.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    # Tasks count
    tasks_count = (await db.execute(
        select(func.count(ReadingTask.id)).where(ReadingTask.competition_id == comp_id)
    )).scalar() or 0

    # Unique participants
    participants = (await db.execute(
        select(func.count(func.distinct(ReadingSession.student_id))).where(ReadingSession.competition_id == comp_id)
    )).scalar() or 0

    # Completed sessions
    completed_sessions = (await db.execute(
        select(func.count(ReadingSession.id)).where(
            ReadingSession.competition_id == comp_id,
            ReadingSession.status == SessionStatus.completed
        )
    )).scalar() or 0

    # Average scores
    avg_completion = (await db.execute(
        select(func.avg(ReadingSession.score_completion)).where(
            ReadingSession.competition_id == comp_id,
            ReadingSession.status == SessionStatus.completed
        )
    )).scalar()

    avg_time = (await db.execute(
        select(func.avg(ReadingSession.reading_time_seconds)).where(
            ReadingSession.competition_id == comp_id,
            ReadingSession.status == SessionStatus.completed
        )
    )).scalar()

    # Has test
    has_test = (await db.execute(
        select(func.count(CompetitionTest.id)).where(CompetitionTest.competition_id == comp_id)
    )).scalar() or 0

    return {
        "competition": _serialize_competition(comp, tasks_count, participants),
        "stats": {
            "tasks_count": tasks_count,
            "participants": participants,
            "completed_sessions": completed_sessions,
            "avg_completion": round(avg_completion, 1) if avg_completion else 0,
            "avg_time_seconds": round(avg_time, 1) if avg_time else 0,
            "has_test": has_test > 0,
        }
    }
