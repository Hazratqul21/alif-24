"""
Olimp Platform Backend - Olympiad Router
Student-facing endpoints reading from shared `olympiads` tables.
Admin creates olympiads via MainPlatform admin panel.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func, select
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import logging

from shared.database import get_db
from shared.database.models import User, StudentProfile, UserRole
from shared.database.models.olympiad import (
    Olympiad, OlympiadQuestion, OlympiadParticipant, OlympiadAnswer,
    OlympiadStatus, ParticipationStatus,
)

logger = logging.getLogger("olimp")

router = APIRouter()


# ============= Pydantic Schemas =============

class OlympiadRegistrationSchema(BaseModel):
    student_id: str  # user_id from frontend


class AnswerSubmit(BaseModel):
    question_id: str
    answer_index: int


# ============= Helpers =============

def _olympiad_to_dict(o: Olympiad) -> dict:
    return {
        "id": o.id,
        "title": o.title,
        "subject": o.subject.value if o.subject else "general",
        "description": o.description,
        "type": o.type.value if o.type else "test",
        "grade_level": o.grade_level,
        "start_time": o.start_time.isoformat() if o.start_time else None,
        "end_time": o.end_time.isoformat() if o.end_time else None,
        "registration_start": o.registration_start.isoformat() if o.registration_start else None,
        "registration_end": o.registration_end.isoformat() if o.registration_end else None,
        "duration_minutes": o.duration_minutes,
        "max_participants": o.max_participants,
        "questions_count": o.questions_count,
        "status": o.status.value if o.status else "draft",
        "results_public": o.results_public,
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
        "order_index": q.order if q.order else 0,
    }


async def _resolve_student_profile(user_id: str, db: AsyncSession) -> Optional[StudentProfile]:
    """Lookup StudentProfile by user_id"""
    res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
    return res.scalar_one_or_none()


# ============= Student-facing: List & Get =============

@router.get("/")
async def list_olympiads(
    status: Optional[str] = None,
    subject: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all olympiads (student browsing)"""
    stmt = select(Olympiad)

    if status:
        try:
            stmt = stmt.where(Olympiad.status == OlympiadStatus(status))
        except ValueError:
            # Invalid status value, return empty list
            return {"success": True, "data": {"olympiads": [], "total": 0}}
    if subject:
        stmt = stmt.where(Olympiad.subject.ilike(f"%{subject}%"))

    result = await db.execute(stmt.order_by(Olympiad.created_at.desc()))
    results = result.scalars().all()

    # Add participant_count for each olympiad
    olympiads_out = []
    for o in results:
        d = _olympiad_to_dict(o)
        cnt_res = await db.execute(
            select(sql_func.count(OlympiadParticipant.id))
            .where(OlympiadParticipant.olympiad_id == o.id)
        )
        d["participant_count"] = cnt_res.scalar() or 0
        olympiads_out.append(d)

    return {
        "success": True,
        "data": {
            "olympiads": olympiads_out,
            "total": len(olympiads_out)
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

    d = _olympiad_to_dict(olympiad)
    cnt_res = await db.execute(
        select(sql_func.count(OlympiadParticipant.id))
        .where(OlympiadParticipant.olympiad_id == olympiad.id)
    )
    d["participant_count"] = cnt_res.scalar() or 0

    return {"success": True, "data": d}


# ============= Student: Questions =============

@router.get("/{olympiad_id}/questions")
async def list_questions(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all questions for an olympiad (for quiz UI)"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalar_one_or_none()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    q_res = await db.execute(
        select(OlympiadQuestion).where(OlympiadQuestion.olympiad_id == olympiad.id)
        .order_by(OlympiadQuestion.order)
    )
    questions = q_res.scalars().all()

    return {
        "success": True,
        "data": {
            "questions": [_question_to_dict(q) for q in questions],
            "total": len(questions)
        }
    }


# ============= Student: Registration =============

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

    # Allow registration for active or upcoming olympiads
    if olympiad.status not in (OlympiadStatus.active, OlympiadStatus.upcoming):
        raise HTTPException(status_code=400, detail="Olimpiada hali faol emas")

    # Check if real user exists and is a student
    user_res = await db.execute(select(User).where(User.id == data.student_id))
    user = user_res.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="Foydalanuvchi topilmadi. Iltimos, ro'yxatdan o'ting.")
        
    if user.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Kechiarsiz, Olimpiadada faqat O'quvchilar ishtirok etishi mumkin!")

    # Resolve student profile from user_id
    sp = await _resolve_student_profile(data.student_id, db)
    if not sp:
        # Auto-create profile if missing (e.g for telegram bot registrations)
        sp = StudentProfile(user_id=user.id)
        db.add(sp)
        await db.commit()
        await db.refresh(sp)

    # Check max participants
    count_res = await db.execute(
        select(sql_func.count(OlympiadParticipant.id)).where(
            OlympiadParticipant.olympiad_id == olympiad.id
        )
    )
    participant_count = count_res.scalar() or 0
    if participant_count >= olympiad.max_participants:
        raise HTTPException(status_code=400, detail="Maksimal ishtirokchilar soni to'lgan")

    # Check if already registered
    exist_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad.id,
            OlympiadParticipant.student_id == sp.id
        )
    )
    existing = exist_res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Siz allaqachon ro'yxatdan o'tgansiz")

    participant = OlympiadParticipant(
        olympiad_id=olympiad.id,
        student_id=sp.id,
        status=ParticipationStatus.registered,
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)

    return {
        "success": True,
        "data": {
            "id": participant.id,
            "olympiad_id": participant.olympiad_id,
            "student_id": data.student_id,
            "registered_at": participant.registered_at.isoformat() if participant.registered_at else None,
        }
    }


# ============= Student: Submit Answers =============

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

    # Find participant
    participant = None
    if student_id:
        sp = await _resolve_student_profile(student_id, db)
        if sp:
            p_res = await db.execute(
                select(OlympiadParticipant).where(
                    OlympiadParticipant.olympiad_id == olympiad.id,
                    OlympiadParticipant.student_id == sp.id,
                )
            )
            participant = p_res.scalar_one_or_none()

    total_score = 0
    correct_count = 0
    wrong_count = 0
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
        else:
            wrong_count += 1

        result_details.append({
            "question_id": answer.question_id,
            "submitted_answer": answer.answer_index,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "points_earned": points
        })

        # Save individual answer if participant exists
        if participant:
            ans_obj = OlympiadAnswer(
                participant_id=participant.id,
                question_id=question.id,
                selected_answer=answer.answer_index,
                is_correct=is_correct,
                points_earned=points,
            )
            db.add(ans_obj)

    # Update participant totals
    if participant:
        participant.status = ParticipationStatus.completed
        participant.total_score = total_score
        participant.correct_answers = correct_count
        participant.wrong_answers = wrong_count
        participant.completed_at = datetime.now(timezone.utc)
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

    p_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad.id,
            OlympiadParticipant.status == ParticipationStatus.completed,
        )
        .order_by(OlympiadParticipant.total_score.desc(), OlympiadParticipant.time_spent_seconds.asc())
        .limit(limit)
    )
    participants = p_res.scalars().all()

    leaderboard = []
    for idx, p in enumerate(participants, 1):
        student_name = f"O'quvchi #{idx}"
        try:
            sp_res = await db.execute(select(StudentProfile).where(StudentProfile.id == p.student_id))
            sp = sp_res.scalar_one_or_none()
            if sp:
                u_res = await db.execute(select(User).where(User.id == sp.user_id))
                u = u_res.scalar_one_or_none()
                if u:
                    student_name = f"{u.first_name} {u.last_name}".strip() or student_name
        except Exception as e:
            logging.warning(f"Failed to get student name for {p.student_id}: {e}")

        leaderboard.append({
            "rank": idx,
            "student_id": p.student_id,
            "student_name": student_name,
            "score": p.total_score,
            "total_points": p.total_score,
            "correct_answers": p.correct_answers,
            "total_questions": p.correct_answers + p.wrong_answers,
            "time_taken_seconds": p.time_spent_seconds,
        })

    return {
        "success": True,
        "data": {
            "olympiad_title": olympiad.title,
            "leaderboard": leaderboard,
            "total_participants": len(leaderboard)
        }
    }
