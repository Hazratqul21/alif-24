"""
Olimp Platform Backend - Olympiad Router
Olimpiadalar yaratish va boshqarish (PostgreSQL)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func, select
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging

from shared.database import get_db
from shared.database.models import User
from app.olimp.models import (
    Olympiad, OlympiadQuestion, OlympiadRegistration as OlympiadRegistrationModel,
    OlympiadResult, OlympiadStatus, OlympiadDifficulty
)

logger = logging.getLogger("olimp")

router = APIRouter()


# ============= Pydantic Schemas =============

class OlympiadCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    max_participants: int = Field(default=100, ge=1, le=10000)
    difficulty: str = Field(default="medium")  # easy, medium, hard
    grade_level: Optional[str] = None  # 1-sinf, 2-sinf, etc.


class OlympiadQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=5)
    options: List[str] = Field(..., min_length=2, max_length=6)
    correct_answer_index: int = Field(..., ge=0)
    points: int = Field(default=10, ge=1, le=100)
    explanation: Optional[str] = None


class OlympiadRegistrationSchema(BaseModel):
    student_id: str


class AnswerSubmit(BaseModel):
    question_id: str
    answer_index: int


def _olympiad_to_dict(o: Olympiad) -> dict:
    return {
        "id": o.id,
        "title": o.title,
        "subject": o.subject,
        "description": o.description,
        "difficulty": o.difficulty.value if o.difficulty else "medium",
        "grade_level": o.grade_level,
        "start_time": o.start_time.isoformat() if o.start_time else None,
        "end_time": o.end_time.isoformat() if o.end_time else None,
        "duration_minutes": o.duration_minutes,
        "max_participants": o.max_participants,
        "status": o.status.value if o.status else "upcoming",
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _question_to_dict(q: OlympiadQuestion) -> dict:
    return {
        "id": q.id,
        "olympiad_id": q.olympiad_id,
        "question_text": q.question_text,
        "options": q.options,
        "correct_answer": q.correct_answer,
        "points": q.points,
        "order_index": q.order_index,
        "explanation": q.explanation,
    }


# ============= Olympiad Management (Admin/Teacher) =============

@router.post("/")
async def create_olympiad(
    data: OlympiadCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new olympiad (for admins/teachers)"""
    olympiad = Olympiad(
        title=data.title,
        subject=data.subject,
        description=data.description,
        start_time=data.start_date,
        end_time=data.end_date,
        max_participants=data.max_participants,
        difficulty=OlympiadDifficulty(data.difficulty),
        grade_level=data.grade_level,
        status=OlympiadStatus.upcoming,
    )
    db.add(olympiad)
    await db.commit()
    await db.refresh(olympiad)

    logger.info(f"Olympiad created: {data.title} (ID: {olympiad.id})")
    return {"success": True, "data": _olympiad_to_dict(olympiad)}


@router.get("/")
async def list_olympiads(
    status: Optional[str] = None,
    subject: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all olympiads, optionally filtered by status or subject"""
    stmt = select(Olympiad)

    if status:
        stmt = stmt.where(Olympiad.status == OlympiadStatus(status))
    if subject:
        stmt = stmt.where(Olympiad.subject.ilike(subject))

    result = await db.execute(stmt.order_by(Olympiad.created_at.desc()))
    results = result.scalars().all()
    return {
        "success": True,
        "data": {
            "olympiads": [_olympiad_to_dict(o) for o in results],
            "total": len(results)
        }
    }


@router.get("/{olympiad_id}")
async def get_olympiad(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get olympiad details"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    return {"success": True, "data": _olympiad_to_dict(olympiad)}


@router.put("/{olympiad_id}")
async def update_olympiad(
    olympiad_id: str,
    data: OlympiadCreate,
    db: AsyncSession = Depends(get_db)
):
    """Update olympiad details"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    olympiad.title = data.title
    olympiad.subject = data.subject
    olympiad.description = data.description
    olympiad.start_time = data.start_date
    olympiad.end_time = data.end_date
    olympiad.max_participants = data.max_participants
    olympiad.difficulty = OlympiadDifficulty(data.difficulty)
    olympiad.grade_level = data.grade_level

    await db.commit()
    await db.refresh(olympiad)
    return {"success": True, "data": _olympiad_to_dict(olympiad)}


@router.post("/{olympiad_id}/activate")
async def activate_olympiad(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Activate olympiad (make it available for registration)"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    count_res = await db.execute(
        select(sql_func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == olympiad.id)
    )
    question_count = count_res.scalar() or 0
    if question_count == 0:
        raise HTTPException(status_code=400, detail="Savollar qo'shilmagan")

    olympiad.status = OlympiadStatus.active
    await db.commit()
    await db.refresh(olympiad)
    return {"success": True, "data": _olympiad_to_dict(olympiad)}


@router.post("/{olympiad_id}/complete")
async def complete_olympiad(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Mark olympiad as completed"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    olympiad.status = OlympiadStatus.completed
    await db.commit()
    await db.refresh(olympiad)
    return {"success": True, "data": _olympiad_to_dict(olympiad)}


@router.delete("/{olympiad_id}")
async def delete_olympiad(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    await db.delete(olympiad)
    await db.commit()
    return {"success": True, "message": "Olimpiada o'chirildi"}


# ============= Questions Management =============

@router.post("/{olympiad_id}/questions")
async def add_question(
    olympiad_id: str,
    data: OlympiadQuestionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a question to an olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    if data.correct_answer_index >= len(data.options):
        raise HTTPException(status_code=400, detail="correct_answer_index options sonidan katta")

    count_res = await db.execute(
        select(sql_func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == olympiad.id)
    )
    current_count = count_res.scalar() or 0

    question = OlympiadQuestion(
        olympiad_id=olympiad.id,
        question_text=data.question_text,
        options=data.options,
        correct_answer=data.correct_answer_index,
        points=data.points,
        order_index=current_count + 1,
        explanation=data.explanation,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    return {"success": True, "data": _question_to_dict(question)}


@router.get("/{olympiad_id}/questions")
async def list_questions(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all questions for an olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    q_res = await db.execute(
        select(OlympiadQuestion).where(OlympiadQuestion.olympiad_id == olympiad.id)
        .order_by(OlympiadQuestion.order_index)
    )
    questions = q_res.scalars().all()

    return {
        "success": True,
        "data": {
            "questions": [_question_to_dict(q) for q in questions],
            "total": len(questions)
        }
    }


@router.delete("/{olympiad_id}/questions/{question_id}")
async def delete_question(
    olympiad_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a question from an olympiad"""
    res = await db.execute(
        select(OlympiadQuestion).where(
            OlympiadQuestion.id == question_id,
            OlympiadQuestion.olympiad_id == olympiad_id
        )
    )
    question = res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Savol topilmadi")

    await db.delete(question)
    await db.commit()
    return {"success": True, "message": "Savol o'chirildi"}


# ============= Student Participation =============

@router.post("/{olympiad_id}/register")
async def register_for_olympiad(
    olympiad_id: str,
    data: OlympiadRegistrationSchema,
    db: AsyncSession = Depends(get_db)
):
    """Register a student for an olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    if olympiad.status != OlympiadStatus.active:
        raise HTTPException(status_code=400, detail="Olimpiada hali faol emas")

    count_res = await db.execute(
        select(sql_func.count(OlympiadRegistrationModel.id)).where(
            OlympiadRegistrationModel.olympiad_id == olympiad.id
        )
    )
    participant_count = count_res.scalar() or 0
    if participant_count >= olympiad.max_participants:
        raise HTTPException(status_code=400, detail="Maksimal ishtirokchilar soni to'lgan")

    exist_res = await db.execute(
        select(OlympiadRegistrationModel).where(
            OlympiadRegistrationModel.olympiad_id == olympiad.id,
            OlympiadRegistrationModel.student_id == data.student_id
        )
    )
    existing = exist_res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Siz allaqachon ro'yxatdan o'tgansiz")

    registration = OlympiadRegistrationModel(
        olympiad_id=olympiad.id,
        student_id=data.student_id,
    )
    db.add(registration)
    await db.commit()
    await db.refresh(registration)

    return {
        "success": True,
        "data": {
            "id": registration.id,
            "olympiad_id": registration.olympiad_id,
            "student_id": registration.student_id,
            "registered_at": registration.registered_at.isoformat() if registration.registered_at else None,
        }
    }


@router.post("/{olympiad_id}/submit")
async def submit_answers(
    olympiad_id: str,
    answers: List[AnswerSubmit],
    student_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Submit answers for an olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    total_score = 0
    correct_count = 0
    result_details = []
    total_points = 0

    for answer in answers:
        q_res = await db.execute(select(OlympiadQuestion).where(OlympiadQuestion.id == answer.question_id))
        question = q_res.scalar_one_or_none()
        if not question:
            continue

        is_correct = answer.answer_index == question.correct_answer
        points = question.points if is_correct else 0
        total_score += points
        total_points += question.points
        if is_correct:
            correct_count += 1

        result_details.append({
            "question_id": answer.question_id,
            "submitted_answer": answer.answer_index,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "points_earned": points
        })

    if student_id:
        result = OlympiadResult(
            olympiad_id=olympiad.id,
            student_id=student_id,
            score=total_score,
            total_points=total_points,
            correct_answers=correct_count,
            total_questions=len(answers),
            answers=result_details,
        )
        db.add(result)
        await db.commit()

    return {
        "success": True,
        "data": {
            "total_score": total_score,
            "total_questions": len(answers),
            "correct_answers": correct_count,
            "results": result_details
        }
    }


# ============= Leaderboard =============

@router.get("/{olympiad_id}/leaderboard")
async def get_leaderboard(
    olympiad_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get olympiad leaderboard with student names"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    from shared.database.models import StudentProfile, User

    r_res = await db.execute(
        select(OlympiadResult).where(OlympiadResult.olympiad_id == olympiad.id)
        .order_by(OlympiadResult.score.desc(), OlympiadResult.time_taken_seconds.asc())
        .limit(limit)
    )
    results = r_res.scalars().all()

    leaderboard = []
    for idx, r in enumerate(results, 1):
        student_name = f"O'quvchi #{r.student_id}"
        try:
            sp_res = await db.execute(select(StudentProfile).where(StudentProfile.id == r.student_id))
            sp = sp_res.scalar_one_or_none()
            if sp:
                u_res = await db.execute(select(User).where(User.id == sp.user_id))
                u = u_res.scalar_one_or_none()
                if u:
                    student_name = f"{u.first_name} {u.last_name}".strip() or student_name
        except Exception:
            pass

        leaderboard.append({
            "rank": idx,
            "student_id": r.student_id,
            "student_name": student_name,
            "score": r.score,
            "total_points": r.total_points,
            "correct_answers": r.correct_answers,
            "total_questions": r.total_questions,
            "time_taken_seconds": r.time_taken_seconds,
        })

    return {
        "success": True,
        "data": {
            "olympiad_title": olympiad.title,
            "leaderboard": leaderboard,
            "total_participants": len(leaderboard)
        }
    }
