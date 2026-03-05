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
from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType

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
    return res.scalars().first()


async def _award_coins(student_id: str, amount: int, tx_type: TransactionType,
                       description: str, reference_id: str, reference_type: str,
                       db: AsyncSession) -> int:
    """Award coins to student — creates/updates StudentCoin + CoinTransaction. Returns new balance."""
    if amount <= 0:
        return 0

    # Get or create StudentCoin
    sc_res = await db.execute(select(StudentCoin).where(StudentCoin.student_id == student_id))
    student_coin = sc_res.scalars().first()

    if not student_coin:
        student_coin = StudentCoin(student_id=student_id)
        db.add(student_coin)
        await db.flush()

    student_coin.add_coins(amount)

    # Record transaction
    tx = CoinTransaction(
        student_coin_id=student_coin.id,
        type=tx_type,
        amount=amount,
        description=description,
        reference_id=reference_id,
        reference_type=reference_type,
    )
    db.add(tx)

    # Also update StudentProfile.total_coins
    sp_res = await db.execute(select(StudentProfile).where(StudentProfile.id == student_id))
    sp = sp_res.scalars().first()
    if sp:
        sp.total_coins = (sp.total_coins or 0) + amount

    return student_coin.current_balance


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


@router.get("/my-profile")
async def get_my_profile(
    student_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Get student's olimpiad profile — coins, participations, history"""
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id kerak")

    sp = await _resolve_student_profile(student_id, db)
    if not sp:
        raise HTTPException(status_code=404, detail="Profil topilmadi")

    # Get user name
    u_res = await db.execute(select(User).where(User.id == student_id))
    user = u_res.scalars().first()
    name = f"{user.first_name} {user.last_name}".strip() if user else "O'quvchi"

    # Get coin balance
    sc_res = await db.execute(select(StudentCoin).where(StudentCoin.student_id == sp.id))
    student_coin = sc_res.scalars().first()
    coin_balance = student_coin.current_balance if student_coin else 0
    total_earned = student_coin.total_earned if student_coin else 0

    # Get olimpiad participations
    p_res = await db.execute(
        select(OlympiadParticipant).where(OlympiadParticipant.student_id == sp.id)
        .order_by(OlympiadParticipant.registered_at.desc())
    )
    participations = p_res.scalars().all()

    history = []
    for p in participations:
        o_res = await db.execute(select(Olympiad).where(Olympiad.id == p.olympiad_id))
        olympiad = o_res.scalars().first()
        history.append({
            "olympiad_id": p.olympiad_id,
            "olympiad_title": olympiad.title if olympiad else "—",
            "status": p.status.value if p.status else "registered",
            "score": p.total_score,
            "correct_answers": p.correct_answers,
            "wrong_answers": p.wrong_answers,
            "coins_earned": p.coins_earned,
            "rank": p.rank,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        })

    return {
        "success": True,
        "data": {
            "name": name,
            "student_id": student_id,
            "coin_balance": coin_balance,
            "total_coins_earned": total_earned,
            "participations_count": len(participations),
            "history": history,
        }
    }


@router.get("/{olympiad_id}")
async def get_olympiad(
    olympiad_id: str,
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get olympiad details"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    d = _olympiad_to_dict(olympiad)
    cnt_res = await db.execute(
        select(sql_func.count(OlympiadParticipant.id))
        .where(OlympiadParticipant.olympiad_id == olympiad.id)
    )
    d["participant_count"] = cnt_res.scalar() or 0
    
    # Check if this student already participated
    d["my_participation"] = None
    if student_id:
        sp = await _resolve_student_profile(student_id, db)
        if sp:
            p_res = await db.execute(
                select(OlympiadParticipant).where(
                    OlympiadParticipant.olympiad_id == olympiad.id,
                    OlympiadParticipant.student_id == sp.id
                )
            )
            participant = p_res.scalars().first()
            if participant:
                d["my_participation"] = {
                    "id": participant.id,
                    "status": participant.status.value if participant.status else "registered",
                    "score": participant.total_score,
                    "correct_answers": participant.correct_answers,
                    "wrong_answers": participant.wrong_answers,
                    "coins_earned": participant.coins_earned,
                    "rank": participant.rank,
                    "registered_at": participant.registered_at.isoformat() if participant.registered_at else None,
                    "completed_at": participant.completed_at.isoformat() if participant.completed_at else None,
                }

    return {"success": True, "data": d}


# ============= Student: Questions =============

@router.get("/{olympiad_id}/questions")
async def list_questions(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all questions for an olympiad (for quiz UI)"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
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
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    # Allow registration for active or upcoming olympiads
    if olympiad.status not in (OlympiadStatus.active, OlympiadStatus.upcoming):
        raise HTTPException(status_code=400, detail="Olimpiada hali faol emas")

    # Check if real user exists and is a student
    user_res = await db.execute(select(User).where(User.id == data.student_id))
    user = user_res.scalars().first()
    
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
    existing = exist_res.scalars().first()
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
    olympiad = res.scalars().first()
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
            participant = p_res.scalars().first()

    total_score = 0
    correct_count = 0
    wrong_count = 0
    result_details = []
    total_points = 0

    for answer in answers:
        q_res = await db.execute(select(OlympiadQuestion).where(OlympiadQuestion.id == answer.question_id))
        question = q_res.scalars().first()
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

    # Calculate coins
    coins = 10  # Base participation
    coins += correct_count * 2  # +2 per correct answer
    if correct_count == len(answers) and len(answers) > 0:
        coins += 20  # Perfect score bonus

    # Update participant totals
    if participant:
        participant.status = ParticipationStatus.completed
        participant.total_score = total_score
        participant.correct_answers = correct_count
        participant.wrong_answers = wrong_count
        participant.coins_earned = coins
        participant.completed_at = datetime.now(timezone.utc)

        # Award coins to student balance
        try:
            await _award_coins(
                student_id=participant.student_id,
                amount=coins,
                tx_type=TransactionType.olympiad_participation,
                description=f"Olimpiada: {olympiad.title} — {correct_count}/{len(answers)} to'g'ri",
                reference_id=olympiad.id,
                reference_type="olympiad",
                db=db,
            )
        except Exception as e:
            logger.error(f"Coin award error: {e}")

        await db.commit()

    return {
        "success": True,
        "data": {
            "total_score": total_score,
            "total_questions": len(answers),
            "correct_answers": correct_count,
            "coins_earned": coins,
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
    olympiad = res.scalars().first()
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
            sp = sp_res.scalars().first()
            if sp:
                u_res = await db.execute(select(User).where(User.id == sp.user_id))
                u = u_res.scalars().first()
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
            "coins_earned": p.coins_earned,
        })

    return {
        "success": True,
        "data": {
            "olympiad_title": olympiad.title,
            "leaderboard": leaderboard,
            "total_participants": len(leaderboard)
        }
    }


# ============= Admin: Participants List =============

@router.get("/{olympiad_id}/participants")
async def get_participants(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get all participants with detailed stats"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    p_res = await db.execute(
        select(OlympiadParticipant).where(OlympiadParticipant.olympiad_id == olympiad.id)
        .order_by(OlympiadParticipant.total_score.desc())
    )
    participants = p_res.scalars().all()

    result = []
    for idx, p in enumerate(participants, 1):
        student_name = f"O'quvchi #{idx}"
        phone = ""
        try:
            sp_res = await db.execute(select(StudentProfile).where(StudentProfile.id == p.student_id))
            sp = sp_res.scalars().first()
            if sp:
                u_res = await db.execute(select(User).where(User.id == sp.user_id))
                u = u_res.scalars().first()
                if u:
                    student_name = f"{u.first_name} {u.last_name}".strip() or student_name
                    phone = u.phone or ""
        except Exception:
            pass

        result.append({
            "participant_id": p.id,
            "student_id": p.student_id,
            "student_name": student_name,
            "phone": phone,
            "status": p.status.value if p.status else "registered",
            "score": p.total_score,
            "correct_answers": p.correct_answers,
            "wrong_answers": p.wrong_answers,
            "time_spent_seconds": p.time_spent_seconds,
            "coins_earned": p.coins_earned,
            "rank": idx,
            "registered_at": p.registered_at.isoformat() if p.registered_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        })

    return {
        "success": True,
        "data": {
            "olympiad_title": olympiad.title,
            "participants": result,
            "total": len(result)
        }
    }


# ============= Admin: Participant Detail =============

@router.get("/{olympiad_id}/participants/{participant_id}")
async def get_participant_detail(
    olympiad_id: str,
    participant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get single participant with all answer details"""
    p_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.id == participant_id,
            OlympiadParticipant.olympiad_id == olympiad_id,
        )
    )
    participant = p_res.scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="Ishtirokchi topilmadi")

    # Student info
    student_name = "O'quvchi"
    phone = ""
    try:
        sp_res = await db.execute(select(StudentProfile).where(StudentProfile.id == participant.student_id))
        sp = sp_res.scalars().first()
        if sp:
            u_res = await db.execute(select(User).where(User.id == sp.user_id))
            u = u_res.scalars().first()
            if u:
                student_name = f"{u.first_name} {u.last_name}".strip() or student_name
                phone = u.phone or ""
    except Exception:
        pass

    # Answers
    a_res = await db.execute(
        select(OlympiadAnswer).where(OlympiadAnswer.participant_id == participant.id)
    )
    answers_list = a_res.scalars().all()

    answer_details = []
    for a in answers_list:
        # Get question text
        q_res = await db.execute(select(OlympiadQuestion).where(OlympiadQuestion.id == a.question_id))
        q = q_res.scalars().first()
        answer_details.append({
            "question_id": a.question_id,
            "question_text": q.question_text if q else "",
            "options": q.options if q else [],
            "selected_answer": a.selected_answer,
            "correct_answer": q.correct_answer if q else None,
            "is_correct": a.is_correct,
            "points_earned": a.points_earned,
        })

    return {
        "success": True,
        "data": {
            "participant_id": participant.id,
            "student_id": participant.student_id,
            "student_name": student_name,
            "phone": phone,
            "status": participant.status.value if participant.status else "registered",
            "score": participant.total_score,
            "correct_answers": participant.correct_answers,
            "wrong_answers": participant.wrong_answers,
            "time_spent_seconds": participant.time_spent_seconds,
            "coins_earned": participant.coins_earned,
            "rank": participant.rank,
            "registered_at": participant.registered_at.isoformat() if participant.registered_at else None,
            "completed_at": participant.completed_at.isoformat() if participant.completed_at else None,
            "answers": answer_details,
        }
    }

