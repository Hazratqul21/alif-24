"""
Olimp Platform Backend - Olympiad Router
Student-facing endpoints reading from shared `olympiads` tables.
Admin creates olympiads via MainPlatform admin panel.
"""
from fastapi import APIRouter, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect, Query, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sql_func, select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Any
from datetime import datetime, timezone, date, timedelta
from email.message import EmailMessage
import asyncio
import hashlib
import logging
import random
import smtplib

from shared.database import get_db
from shared.database.models import User, StudentProfile, UserRole
from shared.database.models.olympiad import (
    Olympiad, OlympiadQuestion, OlympiadParticipant, OlympiadAnswer,
    OlympiadReadingTask, OlympiadReadingSubmission, OlympiadStatus, ParticipationStatus,
    OlympiadSubject, OlympiadType
)
from shared.database.models.olympiad_content import OlympiadLesson, OlympiadStory
from shared.database.models.saved_test import SavedTest, SavedTestStatus
from shared.database.models.coin import StudentCoin, CoinTransaction, TransactionType
from shared.database.models.subscription import UserSubscription, SubscriptionStatus
from shared.database.models.analytics import AuditLog
from shared.auth import verify_token
from app.core.config import settings
from app.olimp.websocket import manager
from app.gamification.models import Badge, UserBadge, DailyActivity, BadgeType

logger = logging.getLogger("olimp")

router = APIRouter()

# ---------------------------------------------------------------------------
# JWT auth helpers (security fix)
# ---------------------------------------------------------------------------
# Student-facing endpoints historically accepted `student_id` in the body/query
# (a real User.id). That enables trivial spoofing — any client could submit as
# anyone. We now prefer JWT cookie/Bearer, falling back to the legacy parameter
# with a warning log so the frontend can be migrated without downtime.
_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[str]:
    """Return User.id from JWT cookie/Bearer token, or None if missing/invalid."""
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        return None
    payload = verify_token(token)
    if not payload:
        return None
    return payload.get("sub")


def resolve_auth_user_id(
    provided: Optional[str],
    authenticated: Optional[str],
) -> str:
    """
    Security gate — JWT wins, legacy param is fallback.

    Returns the authoritative User.id. Raises 401 if neither JWT nor param present.
    Logs a mismatch when both exist but disagree (potential spoof attempt).
    """
    if authenticated:
        if provided and provided != authenticated:
            logger.warning(
                "olimp: student_id mismatch — body=%s jwt=%s (using JWT)",
                provided, authenticated,
            )
        return authenticated
    if provided:
        logger.warning("olimp: legacy student_id used without JWT — frontend migration pending")
        return provided
    raise HTTPException(status_code=401, detail="Autentifikatsiya talab qilinadi")


class BuilderQuestionItem(BaseModel):
    question_text: str = Field(..., min_length=1)
    options: List[str] = Field(..., min_length=2, max_length=6)
    correct_option_index: int = Field(..., ge=0)
    points: int = Field(default=5, ge=1, le=100)
    order_index: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_correct_index_bounds(self):
        if self.correct_option_index >= len(self.options):
            raise ValueError(
                f"correct_option_index ({self.correct_option_index}) options sonidan ({len(self.options)}) kichik bo'lishi kerak"
            )
        return self
    
def _validate_banner_url(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return v
    v = v.strip()
    if len(v) > 500:
        raise ValueError("Banner URL 500 belgidan oshmasligi kerak")
    if not (v.startswith("http://") or v.startswith("https://") or v.startswith("/")):
        raise ValueError("Banner URL http://, https:// yoki / bilan boshlanishi kerak")
    return v


class BuilderPayload(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    time_limit_minutes: int = Field(default=30, ge=1, le=1440)
    difficulty: str = "medium"
    min_age: int = Field(default=4, ge=1, le=100)
    max_age: int = Field(default=18, ge=1, le=100)
    total_point: int = Field(..., ge=0)
    banner_image: Optional[str] = None
    questions: List[BuilderQuestionItem]

    @field_validator("banner_image")
    @classmethod
    def validate_banner(cls, v):
        return _validate_banner_url(v)

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        if v not in ("easy", "medium", "hard"):
            raise ValueError("difficulty faqat 'easy', 'medium' yoki 'hard' bo'lishi mumkin")
        return v

    @model_validator(mode="after")
    def validate_dates_and_ages(self):
        if self.end_date <= self.start_date:
            raise ValueError("Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak")
        if self.min_age > self.max_age:
            raise ValueError("Minimal yosh maximal yoshdan kichik bo'lishi kerak")
        return self


# ============= Admin Auth =============

async def verify_admin_key(
    x_admin_key: str = Header(..., alias="X-Admin-Key"),
    x_admin_role: Optional[str] = Header(None, alias="X-Admin-Role"),
):
    """Admin key tekshirish — MainPlatform va Olimp formatlarini qo'llab quvvatlaydi.

    Single shared secret (`ADMIN_SECRET_KEY`) — the role header is treated as
    a label only, not an additional secret. Role-based access will move to
    per-user RBAC in a follow-up.
    """
    if x_admin_key and x_admin_key == settings.ADMIN_SECRET_KEY:
        return True
    raise HTTPException(status_code=403, detail="Admin emas")


# ============= Pydantic Schemas =============

class OlympiadRegistrationSchema(BaseModel):
    # Legacy: frontend historically passes User.id here (not StudentProfile.id).
    # Kept for backward compatibility — JWT auth now supersedes it.
    student_id: Optional[str] = None


class AnswerSubmit(BaseModel):
    question_id: str
    answer_index: int


# ============= Helpers =============

# ---------------------------------------------------------------------------
# Deterministic per-student shuffle
# ---------------------------------------------------------------------------
# Anti-cheat: every participant sees questions (and per-question options) in a
# unique but stable order, so "question #3 answer is B" leaks are useless.
# Determinism is critical — if we generated a fresh random order on each /questions
# call, a page refresh would reshuffle mid-test and students would lose work.
#
# Seed = SHA-256 of a fixed scope + user_id + olympiad_id (+ question_id for
# option-level shuffle). Same (user, olympiad) always yields the same order.

def _seeded_random(*parts: str) -> random.Random:
    """Return a Random instance seeded by a stable hash of all parts."""
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).digest()
    seed_int = int.from_bytes(digest[:8], "big")
    return random.Random(seed_int)


def _shuffled_indices(n: int, *seed_parts: str) -> list[int]:
    """Deterministic permutation of range(n). Empty list if n <= 0."""
    if n <= 0:
        return []
    indices = list(range(n))
    _seeded_random(*seed_parts).shuffle(indices)
    return indices


def _option_permutation(user_id: str, olympiad_id: str, question_id: str, n_options: int) -> list[int]:
    """shuffled_index -> original_index mapping for a single question."""
    return _shuffled_indices(n_options, "opt", user_id, olympiad_id, str(question_id))


def _question_permutation(user_id: str, olympiad_id: str, n_questions: int) -> list[int]:
    """shuffled_position -> original_position mapping for the full question set."""
    return _shuffled_indices(n_questions, "qorder", user_id, olympiad_id)


def _olympiad_to_dict(o: Olympiad) -> dict:
    return {
        "id": o.id,
        "title": o.title,
        "subject": o.subject.value if getattr(o, 'subject', None) else "general",
        "description": getattr(o, 'description', None),
        "type": o.type.value if getattr(o, 'type', None) else "test",
        "grade_level": getattr(o, 'grade_level', None),
        "start_time": o.start_time.isoformat() if getattr(o, 'start_time', None) else None,
        "end_time": o.end_time.isoformat() if getattr(o, 'end_time', None) else None,
        "registration_start": o.registration_start.isoformat() if getattr(o, 'registration_start', None) else None,
        "registration_end": o.registration_end.isoformat() if getattr(o, 'registration_end', None) else None,
        "duration_minutes": getattr(o, 'duration_minutes', 30),
        "max_participants": getattr(o, 'max_participants', 1000),
        "questions_count": getattr(o, 'questions_count', 0),
        "status": o.status.value if getattr(o, 'status', None) else "draft",
        "results_public": getattr(o, 'results_public', True),
        "difficulty": getattr(o, 'difficulty', "medium"),
        "banner_image": getattr(o, 'banner_image', None),
        "created_at": o.created_at.isoformat() if getattr(o, 'created_at', None) else None,
    }


def _question_to_dict(q: OlympiadQuestion, include_answer: bool = False) -> dict:
    result = {
        "id": q.id,
        "olympiad_id": q.olympiad_id,
        "question_text": q.question_text,
        "options": q.options,
        "points": q.points,
        "order_index": q.order if q.order else 0,
    }
    if include_answer:
        result["correct_answer"] = q.correct_answer
    return result


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

    # Sync cached total_coins in StudentProfile
    sp_res = await db.execute(select(StudentProfile).where(StudentProfile.id == student_id))
    sp = sp_res.scalars().first()
    if sp:
        sp.total_coins = student_coin.current_balance

    return student_coin.current_balance


# ---------------------------------------------------------------------------
# Gamification hooks — called on olympiad completion (non-fatal, best-effort)
# ---------------------------------------------------------------------------
async def _touch_daily_activity(student_profile_id: str, db: AsyncSession) -> Optional[DailyActivity]:
    """
    Update `gamification_daily_activity` streak for the student.
    Idempotent per day: multiple completions on the same day don't inflate streak.
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    da_res = await db.execute(
        select(DailyActivity).where(DailyActivity.user_id == student_profile_id)
    )
    da = da_res.scalars().first()

    if not da:
        da = DailyActivity(
            user_id=student_profile_id,
            last_active_date=now,
            current_streak=1,
            longest_streak=1,
        )
        db.add(da)
        await db.flush()
        return da

    last_date = da.last_active_date.date() if da.last_active_date else None
    if last_date == today:
        return da  # Already counted today — keep streak as-is

    if last_date and (today - last_date).days == 1:
        da.current_streak = (da.current_streak or 0) + 1
    else:
        da.current_streak = 1

    if (da.longest_streak or 0) < da.current_streak:
        da.longest_streak = da.current_streak

    da.last_active_date = now
    return da


async def _award_badges(
    student_profile_id: str,
    db: AsyncSession,
    *,
    completed_count: Optional[int] = None,
    current_streak: Optional[int] = None,
) -> List[Badge]:
    """
    Grant any Badge whose `condition_value` ≤ the relevant metric and which
    the student hasn't earned yet. Returns the list of newly-awarded badges.

    `completed_count` covers `participation` badges; `current_streak` covers
    `streak` badges. Either can be None (skipped).
    """
    newly_awarded: List[Badge] = []

    # Build dynamic conditions based on provided metrics
    type_conditions = []
    if completed_count is not None:
        type_conditions.append(
            (Badge.badge_type == BadgeType.participation)
            & (Badge.condition_value <= completed_count)
        )
    if current_streak is not None:
        type_conditions.append(
            (Badge.badge_type == BadgeType.streak)
            & (Badge.condition_value <= current_streak)
        )
    if not type_conditions:
        return newly_awarded

    combined = type_conditions[0]
    for cond in type_conditions[1:]:
        combined = combined | cond

    eligible_res = await db.execute(select(Badge).where(combined))
    eligible = eligible_res.scalars().all()
    if not eligible:
        return newly_awarded

    earned_res = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == student_profile_id)
    )
    earned_ids = {row[0] for row in earned_res.all()}

    for badge in eligible:
        if badge.id in earned_ids:
            continue
        db.add(UserBadge(user_id=student_profile_id, badge_id=badge.id))
        newly_awarded.append(badge)

        # Optional coin reward on badge unlock
        if badge.coin_reward and badge.coin_reward > 0:
            try:
                await _award_coins(
                    student_id=student_profile_id,
                    amount=badge.coin_reward,
                    tx_type=TransactionType.admin_adjustment,
                    description=f"Badge unlocked: {badge.name}",
                    reference_id=badge.id,
                    reference_type="badge",
                    db=db,
                )
            except Exception as e:
                logger.warning(f"Badge coin reward failed for {badge.id}: {e}")

    return newly_awarded


async def _run_gamification_post_completion(
    participant: OlympiadParticipant, db: AsyncSession
) -> None:
    """
    Run streak + badge updates after a student completes an olympiad.
    Fully non-fatal — any DB/logic failure here must not roll back the
    parent commit. Caller must have already committed or flushed the
    participant state.
    """
    try:
        da = await _touch_daily_activity(participant.student_id, db)

        # Count completed olympiads for participation badges
        count_res = await db.execute(
            select(sql_func.count(OlympiadParticipant.id)).where(
                OlympiadParticipant.student_id == participant.student_id,
                OlympiadParticipant.status == ParticipationStatus.completed,
            )
        )
        completed_count = int(count_res.scalar() or 0)

        awarded = await _award_badges(
            participant.student_id,
            db,
            completed_count=completed_count,
            current_streak=(da.current_streak if da else None),
        )
        if awarded:
            logger.info(
                "Gamification: awarded %d badge(s) to student_profile=%s — %s",
                len(awarded), participant.student_id, [b.name for b in awarded],
            )
    except Exception as e:
        logger.warning(f"Gamification post-completion hook failed (non-fatal): {e}")


# ============= Student-facing: List & Get =============

@router.get("/")
async def list_olympiads(
    status: Optional[str] = None,
    subject: Optional[str] = None,
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all olympiads (student browsing)"""
    stmt = select(Olympiad)
    now = datetime.now(timezone.utc)

    if status:
        try:
            stmt = stmt.where(Olympiad.status == OlympiadStatus(status))
        except ValueError:
            return {"success": True, "data": {"olympiads": [], "total": 0}}
    else:
        # Default: Show only upcoming, active, finished (not draft or cancelled)
        # Auto-filter by dates: upcoming (start_time > now), active (start_time <= now < end_time), finished (end_time <= now)
        stmt = stmt.where(
            Olympiad.status.in_([OlympiadStatus.upcoming, OlympiadStatus.active, OlympiadStatus.finished])
        )

    # Auto-filter by dates based on status (even if explicit status is passed)
    if status == "upcoming":
        stmt = stmt.where((Olympiad.start_time > now) | (Olympiad.status == OlympiadStatus.upcoming))
    elif status == "active":
        stmt = stmt.where(Olympiad.start_time <= now, Olympiad.end_time > now)
    elif status == "finished" or status == "completed":
        stmt = stmt.where(Olympiad.end_time <= now)

    if subject:
        try:
            subject_enum = OlympiadSubject(subject)
            stmt = stmt.where(Olympiad.subject == subject_enum)
        except ValueError:
            pass

    if student_id:
        user_res = await db.execute(select(User).where(User.id == student_id))
        user = user_res.scalars().first()
        if user and user.date_of_birth:
            today = date.today()
            age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            # Show olympiad if:
            # - Neither min nor max is set (open for all)
            # - Or age is strictly within the bounds
            stmt = stmt.where(
                ((Olympiad.min_age == None) | (Olympiad.min_age <= age)) &
                ((Olympiad.max_age == None) | (Olympiad.max_age >= age))
            )

    result = await db.execute(stmt.order_by(Olympiad.created_at.desc()))
    results = result.scalars().all()

    # Get all participant counts in ONE query using subquery (fixes N+1)
    olympiad_ids = [o.id for o in results]
    participant_counts = {}
    if olympiad_ids:
        count_res = await db.execute(
            select(OlympiadParticipant.olympiad_id, sql_func.count(OlympiadParticipant.id))
            .where(OlympiadParticipant.olympiad_id.in_(olympiad_ids))
            .group_by(OlympiadParticipant.olympiad_id)
        )
        participant_counts = dict(count_res.all())

    # Build output
    olympiads_out = []
    for o in results:
        d = _olympiad_to_dict(o)
        d["participant_count"] = participant_counts.get(o.id, 0)
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
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Get student's olimpiad profile — coins, participations, history.

    `student_id` here is legacy — actual User.id. New clients authenticate
    via JWT cookie; the query param is kept for backward compatibility.
    """
    user_id = resolve_auth_user_id(student_id, auth_user_id)

    sp = await _resolve_student_profile(user_id, db)
    if not sp:
        raise HTTPException(status_code=404, detail="Profil topilmadi")

    # Get user name
    u_res = await db.execute(select(User).where(User.id == user_id))
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

    # Batch-load related olympiads in ONE query (fixes N+1)
    olympiad_ids = list({p.olympiad_id for p in participations if p.olympiad_id})
    olympiads_map: dict = {}
    if olympiad_ids:
        o_res = await db.execute(
            select(Olympiad).where(Olympiad.id.in_(olympiad_ids))
        )
        olympiads_map = {o.id: o for o in o_res.scalars().all()}

    history = []
    for p in participations:
        olympiad = olympiads_map.get(p.olympiad_id)
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
    # BUG-9: Prevent route conflict - reserved route names should not be treated as olympiad_id
    reserved_routes = ["my-profile", "my-analytics", "admin", "ertaklar"]
    if any(olympiad_id.startswith(name) for name in reserved_routes):
        raise HTTPException(
            status_code=404,
            detail=f"'{olympiad_id}' endpoint not found. Use correct path."
        )

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
                    "status": participant.status.value if getattr(participant, 'status', None) else "registered",
                    "score": getattr(participant, 'total_score', 0),
                    "correct_answers": getattr(participant, 'correct_answers', 0),
                    "wrong_answers": getattr(participant, 'wrong_answers', 0),
                    "coins_earned": getattr(participant, 'coins_earned', 0),
                    "rank": getattr(participant, 'rank', None),
                    "registered_at": participant.registered_at.isoformat() if getattr(participant, 'registered_at', None) else None,
                    "started_at": participant.started_at.isoformat() if getattr(participant, 'started_at', None) else None,
                    "completed_at": participant.completed_at.isoformat() if getattr(participant, 'completed_at', None) else None,
                }

    return {"success": True, "data": d}


# ============= Student: Questions =============

@router.get("/{olympiad_id}/questions")
async def list_questions(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Get all questions for an olympiad.

    If the caller is authenticated, both question order AND each question's
    option order are shuffled with a deterministic per-student seed. Same
    student + same olympiad = same order every time (safe to refresh), but
    different students see different orders — defeats "answer #3 is B"
    leaks. Unauthenticated callers (preview) receive the canonical order.
    """
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    q_res = await db.execute(
        select(OlympiadQuestion).where(OlympiadQuestion.olympiad_id == olympiad.id)
        .order_by(OlympiadQuestion.order)
    )
    questions = q_res.scalars().all()
    result_questions = [_question_to_dict(q) for q in questions]

    try:
        st_res = await db.execute(
            select(SavedTest).where(
                SavedTest.source_platform == f"olympiad:{olympiad_id}",
                SavedTest.status == SavedTestStatus.published.value
            ).order_by(SavedTest.created_at)
        )
        saved_tests = st_res.scalars().all()
        offset = len(result_questions)
        for st in saved_tests:
            qs = st.questions or []
            for idx, q in enumerate(qs):
                result_questions.append({
                    "id": f"testai_{st.id}_{idx}",
                    "olympiad_id": olympiad_id,
                    "question_text": q.get("question") or q.get("question_text") or "",
                    "options": q.get("options", []),
                    "points": q.get("points", 5),
                    "order_index": offset + idx,
                })
    except Exception as e:
        logger.warning(f"SavedTest savollarini yuklashda xatolik: {e}")

    # Per-student shuffle — only when authenticated.
    if auth_user_id and result_questions:
        # Option-level shuffle: rewrite each question's `options` array.
        # The submit path re-derives the same permutation and translates
        # `answer_index` back to the original index before grading, so the
        # client can treat the index opaquely.
        for q in result_questions:
            opts = q.get("options") or []
            if len(opts) >= 2:
                perm = _option_permutation(auth_user_id, olympiad_id, q["id"], len(opts))
                q["options"] = [opts[i] for i in perm]
        # Question-level shuffle.
        perm_q = _question_permutation(auth_user_id, olympiad_id, len(result_questions))
        result_questions = [result_questions[i] for i in perm_q]
        # Rewrite order_index so the client renders in the shuffled order.
        for new_idx, q in enumerate(result_questions):
            q["order_index"] = new_idx

    return {
        "success": True,
        "data": {
            "questions": result_questions,
            "total": len(result_questions),
            "shuffled": bool(auth_user_id),
        }
    }


# ============= Student: Registration =============

@router.post("/{olympiad_id}/register")
async def register_for_olympiad(
    olympiad_id: str,
    data: OlympiadRegistrationSchema,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Register a student for an olympiad"""
    user_id = resolve_auth_user_id(data.student_id, auth_user_id)

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    # Allow registration only for active or upcoming olympiads (and strict date checks)
    now = datetime.now(timezone.utc)
    
    if olympiad.status not in (OlympiadStatus.active, OlympiadStatus.upcoming):
        raise HTTPException(status_code=400, detail="Olimpiada hali faol emas")

    # Registration window: registration_start <= now <= registration_end
    if olympiad.registration_start and now < olympiad.registration_start:
        raise HTTPException(status_code=400, detail="Ro'yxatdan o'tish hali boshlanmagan")

    if olympiad.registration_end and now > olympiad.registration_end:
        raise HTTPException(status_code=400, detail="Ro'yxatdan o'tish muddati tugagan")

    # Check if real user exists and is a student
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Foydalanuvchi topilmadi. Iltimos, ro'yxatdan o'ting.")
        
    if user.role != UserRole.student:
        raise HTTPException(status_code=400, detail="Kechirasiz, Olimpiadada faqat O'quvchilar ishtirok etishi mumkin!")

    # Check age restriction
    if user.date_of_birth:
        today = date.today()
        # Calculate age correctly accounting for leap years & months
        age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
        
        min_age = olympiad.min_age or 4
        max_age = olympiad.max_age or 18
        
        if age < min_age or age > max_age:
            raise HTTPException(
                status_code=400, 
                detail=f"Sizning yoshingiz ({age}) ushbu olimpiada talabiga ({min_age}-{max_age} yosh) mos kelmaydi."
            )
    else:
        # If no dob is set, we could optionally block them or let them pass.
        # Since this is a strict age-based competition, let's require DOB.
        raise HTTPException(
            status_code=400,
            detail="Tug'ilgan sanangiz kiritilmagan. Iltimos, profilingizni to'ldiring."
        )

    # Check subscription (active or free trial)
    subscription_res = await db.execute(
        select(UserSubscription)
        .where(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active.value,
            UserSubscription.expires_at > now
        )
        .order_by(UserSubscription.expires_at.desc())
    )
    subscription = subscription_res.scalars().first()

    if not subscription:
        # Check if user has free trial (14 kun bepul)
        # Trial: 14 kun ichida yaratilgan va muddati o'tmagan
        from datetime import timedelta
        trial_start = now - timedelta(days=14)

        trial_sub_res = await db.execute(
            select(UserSubscription)
            .where(
                UserSubscription.user_id == user_id,
                UserSubscription.created_at > trial_start,
                UserSubscription.expires_at > now  # Trial muddati o'tmagan bo'lishi kerak
            )
            .order_by(UserSubscription.created_at.desc())
        )
        trial_sub = trial_sub_res.scalars().first()

        if not trial_sub:
            raise HTTPException(
                status_code=403,
                detail="Olimpiadada ishtirok etish uchun obuna kerak. Iltimos, obuna sotib oling yoki 14 kun bepul sinov uchun ro'yxatdan o'ting."
            )

    # Resolve student profile from user_id
    sp = await _resolve_student_profile(user_id, db)
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
            "student_id": user_id,
            "registered_at": participant.registered_at.isoformat() if participant.registered_at else None,
        }
    }


# ============= Student: Start Olympiad =============

@router.post("/{olympiad_id}/start")
async def start_olympiad(
    olympiad_id: str,
    data: OlympiadRegistrationSchema,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Mark olympiad as started by the student"""
    user_id = resolve_auth_user_id(data.student_id, auth_user_id)
    sp = await _resolve_student_profile(user_id, db)
    if not sp:
        raise HTTPException(status_code=404, detail="Profil topilmadi")

    p_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.student_id == sp.id
        )
    )
    participant = p_res.scalars().first()
    if not participant:
        raise HTTPException(status_code=400, detail="Avval ro'yxatdan o'ting")

    if participant.status == ParticipationStatus.completed:
        raise HTTPException(status_code=400, detail="Siz allaqachon olimpiadani yakunlagansiz")

    if not participant.started_at:
        participant.started_at = datetime.now(timezone.utc)
        participant.status = ParticipationStatus.started
        await db.commit()
    
    return {"success": True, "data": {"started_at": participant.started_at.isoformat()}}


# ============= Student: Submit Answers =============

@router.post("/{olympiad_id}/submit")
async def submit_answers(
    olympiad_id: str,
    answers: List[AnswerSubmit],
    student_id: Optional[str] = Query(None, description="Legacy: Student user_id (JWT preferred)"),
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Submit answers for an olympiad. Auth via JWT cookie (Bearer fallback)."""
    try:
        # Security: prefer JWT, fall back to legacy `student_id` with warning.
        student_id = resolve_auth_user_id(student_id, auth_user_id)

        res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
        olympiad = res.scalars().first()
        if not olympiad:
            raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

        now = datetime.now(timezone.utc)

        # Admin-finalized olympiads are read-only. Prevents late resubmissions
        # after rank+prizes have been assigned.
        if olympiad.status == OlympiadStatus.finished:
            raise HTTPException(
                status_code=400,
                detail="Olimpiada yakunlangan — natijalar muhrlangan, qabul qilinmaydi.",
            )

        # Olimpiada boshlanishidan oldin submit qilib bo'lmaydi (reading-submit
        # bilan paralel xatti-harakat).
        if olympiad.start_time and now < olympiad.start_time:
            raise HTTPException(
                status_code=400,
                detail="Olimpiada hali boshlanmagan. Iltimos, belgilangan vaqtni kuting.",
            )

        # Muddat tugaganmi? (5 minutlik grace tarmoq nosozliklari uchun)
        if olympiad.end_time and now > (olympiad.end_time + timedelta(minutes=5)):
            raise HTTPException(
                status_code=400,
                detail="Olimpiada muddasi allaqachon tugagan! Javoblaringiz qabul qilinmadi.",
            )

        # Find participant — row-lock to serialise concurrent submits.
        participant = None
        sp = await _resolve_student_profile(student_id, db)
        if not sp:
            raise HTTPException(status_code=400, detail="Profil topilmadi. Iltimos, ro'yxatdan o'ting.")

        p_res = await db.execute(
            select(OlympiadParticipant)
            .where(
                OlympiadParticipant.olympiad_id == olympiad.id,
                OlympiadParticipant.student_id == sp.id,
            )
            .with_for_update()
        )
        participant = p_res.scalars().first()
        if not participant:
            raise HTTPException(
                status_code=400,
                detail="Avval olimpiadaga ro'yxatdan o'ting.",
            )

        if participant.status == ParticipationStatus.completed:
            raise HTTPException(
                status_code=400,
                detail="Ushbu olimpiadaga allaqachon javob topshirgansiz.",
            )

        # `/start` majburiy — started_at'siz submit qabul qilinmaydi. Bu
        # `duration_minutes` tekshiruvini chetlab o'tish yo'lini yopadi.
        if not participant.started_at:
            raise HTTPException(
                status_code=400,
                detail="Avval olimpiadani boshlang (/start) — so'ngra javoblarni yuboring.",
            )

        # Test davomiyligi (duration_minutes) nazorati
        if olympiad.duration_minutes:
            delta = now - participant.started_at
            time_spent_seconds = int(delta.total_seconds())
            max_allowed_seconds = (olympiad.duration_minutes * 60) + 90  # +1.5 min grace

            if time_spent_seconds > max_allowed_seconds:
                # Vaqtidan o'tib ketgan, natijani 0 bilan yopamiz.
                participant.status = ParticipationStatus.completed
                participant.time_spent_seconds = time_spent_seconds
                participant.total_score = 0
                participant.completed_at = now
                await db.commit()
                raise HTTPException(
                    status_code=400,
                    detail="Ajratilgan vaqt (Time Limit) tugagan! Natijangiz bekor qilindi.",
                )

        total_score = 0
        correct_count = 0
        wrong_count = 0
        result_details = []
        total_points = 0

        logger.info(f"SUBMIT TEST: olympiad={olympiad_id}, student={student_id}, answers_count={len(answers)}")

        # Pre-fetch SavedTests for this olympiad to handle TestAI questions efficiently
        st_res = await db.execute(
            select(SavedTest).where(SavedTest.source_platform == f"olympiad:{olympiad_id}")
        )
        saved_tests_map = {st.id: st for st in st_res.scalars().all()}
        logger.info(f"Loaded {len(saved_tests_map)} SavedTests for lookup")

        for answer in answers:
            question_data = None
            is_olympiad_q = False
            n_options: int = 0

            logger.info(f"Checking question_id: {answer.question_id}")
            
            if str(answer.question_id).startswith("testai_"):
                # Handle TestAI questions: testai_{st_id}_{idx}
                parts = str(answer.question_id).split("_")
                if len(parts) >= 3:
                    st_id, q_idx_str = parts[1], parts[2]
                    try:
                        q_idx = int(q_idx_str)
                        st_obj = saved_tests_map.get(st_id)
                        if not st_obj:
                            q_st = await db.execute(select(SavedTest).where(SavedTest.id == st_id))
                            st_obj = q_st.scalars().first()
                        
                        if st_obj and st_obj.questions and 0 <= q_idx < len(st_obj.questions):
                            st_q = st_obj.questions[q_idx]
                            question_data = {
                                "correct_answer": st_q.get("correct") if st_q.get("correct") is not None else st_q.get("answer_index"),
                                "points": st_q.get("points", 5)
                            }
                            n_options = len(st_q.get("options") or [])
                    except (ValueError, IndexError):
                        continue
            else:
                q_res = await db.execute(select(OlympiadQuestion).where(OlympiadQuestion.id == answer.question_id))
                question = q_res.scalars().first()
                if question:
                    question_data = {
                        "correct_answer": question.correct_answer,
                        "points": question.points
                    }
                    is_olympiad_q = True
                    n_options = len(question.options or [])

            if not question_data:
                continue

            # Reverse the per-student option shuffle. The index the client
            # submitted is indexed into the SHUFFLED options array they saw
            # in /questions — we translate it back to the canonical index
            # before comparing with the stored `correct_answer`.
            submitted_idx_original = answer.answer_index
            try:
                submitted_idx_int = int(answer.answer_index)
            except (ValueError, TypeError):
                submitted_idx_int = None

            # Only reverse when the request was JWT-authenticated — /questions
            # shuffles only for authenticated callers. Legacy student_id-only
            # submits (transitional) receive unshuffled questions, so their
            # indices must pass through as-is.
            if (
                auth_user_id
                and submitted_idx_int is not None
                and n_options >= 2
                and 0 <= submitted_idx_int < n_options
            ):
                perm = _option_permutation(auth_user_id, olympiad_id, answer.question_id, n_options)
                submitted_idx_original = perm[submitted_idx_int]

            try:
                is_correct = int(submitted_idx_original) == int(question_data["correct_answer"])
            except (ValueError, TypeError):
                is_correct = False

            points = question_data["points"] if is_correct else 0
            logger.info(
                f"Result for q={answer.question_id}: is_correct={is_correct}, "
                f"shuffled_idx={answer.answer_index}, original_idx={submitted_idx_original}, "
                f"expected={question_data['correct_answer']}, points={points}"
            )
            total_score += points
            total_points += question_data["points"]
            
            if is_correct:
                correct_count += 1
            else:
                wrong_count += 1

            result_details.append({
                "question_id": answer.question_id,
                "submitted_answer": answer.answer_index,
                "original_answer_index": submitted_idx_original,
                "is_correct": is_correct,
                "points_earned": points
            })

            if participant and is_olympiad_q:
                ans_obj = OlympiadAnswer(
                    participant_id=participant.id,
                    question_id=answer.question_id,
                    selected_answer=submitted_idx_original,
                    is_correct=is_correct,
                    points_earned=points,
                )
                db.add(ans_obj)

        # Calculate coins
        coins = 10  # Base participation
        coins += correct_count * 2  # +2 per correct answer
        if correct_count == len(answers) and len(answers) > 0:
            coins += 20  # Perfect score bonus

        # Calculate time spent
        if participant:
            if participant.started_at:
                delta = datetime.now(timezone.utc) - participant.started_at
                participant.time_spent_seconds = int(delta.total_seconds())
            else:
                participant.time_spent_seconds = 0

        # Update participant totals
        if participant:
            participant.status = ParticipationStatus.completed
            participant.correct_answers = correct_count
            participant.wrong_answers = wrong_count
            participant.coins_earned = (participant.coins_earned or 0) + coins
            participant.completed_at = datetime.now(timezone.utc)

            # Unified scoring: create/update submission record for the general test part
            # so it's aggregated correctly in mixed olympiads.
            sub_res = await db.execute(
                select(OlympiadReadingSubmission).where(
                    OlympiadReadingSubmission.participant_id == participant.id,
                    OlympiadReadingSubmission.story_id == None,
                    OlympiadReadingSubmission.reading_task_id == None
                )
            )
            submission = sub_res.scalars().first()
            submission_existed = submission is not None
            
            if not submission:
                submission = OlympiadReadingSubmission(participant_id=participant.id)
                db.add(submission)
            
            # Only update scores on first submission
            if not submission_existed:
                submission.total_points = total_score
                submission.comprehension_score = correct_count
                submission.comprehension_total = len(answers)
                submission.earned_coins = coins
                submission.submitted_at = datetime.now(timezone.utc)
            
            await db.flush()

            # --- Aggregation: sum ALL submissions (reading + test) ---
            all_subs_res = await db.execute(
                select(OlympiadReadingSubmission).where(
                    OlympiadReadingSubmission.participant_id == participant.id
                )
            )
            all_subs = all_subs_res.scalars().all()
            total_points_sum = sum(s.total_points or 0 for s in all_subs)
            participant.total_score = int(total_points_sum)
            
            logger.info(f"TEST AGGREGATION: participant={participant.id}, test_score={total_score}, total_score={total_points_sum}, all_subs={len(all_subs)}")

            # Award coins to student balance (only on first submission)
            if not submission_existed:
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

                # Gamification: streak + participation/streak badges (non-fatal)
                await _run_gamification_post_completion(participant, db)

            await db.commit()
            
            # SOC-3: Broadcast update to all clients watching this olympiad's live leaderboard
            try:
                await manager.broadcast(olympiad.id, {"type": "leaderboard_update"})
            except Exception as e:
                logger.error(f"WS Broadcast error: {e}")

        return {
            "success": True,
            "data": {
                "quiz_score": total_score,
                "total_score": total_score,
                "total_questions": len(answers),
                "correct_answers": correct_count,
                "quiz_coins": coins,
                "total_coins": coins,
                "coins_earned": coins,
                "results": result_details
            }
        }
    except HTTPException:
        raise
    except IntegrityError as e:
        # Unique-constraint tripped (e.g. concurrent duplicate submit). Surface
        # as 409 Conflict so the client can show "already submitted" instead
        # of a generic 500.
        await db.rollback()
        logger.warning(f"submit_answers IntegrityError (duplicate submit?): {e}")
        raise HTTPException(
            status_code=409,
            detail="Javob yuborishni qayta urinish — avvalgi urinish allaqachon qayd etildi.",
        )
    except Exception as e:
        logger.error(f"FATAL ERROR in submit_answers: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Serverda xatolik yuz berdi: {str(e)}")


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

    # Use joinedload to avoid N+1 queries - load student profile with user in one query
    p_res = await db.execute(
        select(OlympiadParticipant)
        .options(selectinload(OlympiadParticipant.student).selectinload(StudentProfile.user))
        .where(
            OlympiadParticipant.olympiad_id == olympiad.id,
            OlympiadParticipant.status == ParticipationStatus.completed,
        )
        .order_by(OlympiadParticipant.total_score.desc(), OlympiadParticipant.time_spent_seconds.asc(), OlympiadParticipant.completed_at.asc())
        .limit(limit)
    )
    participants = p_res.scalars().all()

    leaderboard = []
    for idx, p in enumerate(participants, 1):
        student_name = f"O'quvchi #{idx}"
        try:
            # Already loaded via joinedload - no additional queries
            sp = p.student
            if sp and sp.user:
                student_name = f"{sp.user.first_name} {sp.user.last_name}".strip() or student_name
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

@router.websocket("/{olympiad_id}/ws/leaderboard")
async def websocket_leaderboard(websocket: WebSocket, olympiad_id: str):
    """WebSocket for Real-time Leaderboard Updates"""
    await manager.connect(websocket, olympiad_id)
    try:
        while True:
            # Client doesn't need to send anything, 
            # we just keep the connection alive to receive broadcast events.
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, olympiad_id)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket, olympiad_id)


# ============= Admin: Participants List =============

@router.get("/{olympiad_id}/participants")
async def get_participants(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
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
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
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


@router.get("/{olympiad_id}/my-results")
async def get_my_results(
    olympiad_id: str,
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Student: Get my own answer breakdown for an olympiad"""
    user_id = resolve_auth_user_id(student_id, auth_user_id)

    sp = await _resolve_student_profile(user_id, db)
    if not sp:
        raise HTTPException(status_code=404, detail="Profil topilmadi")

    p_res = await db.execute(
        select(OlympiadParticipant).where(
            OlympiadParticipant.olympiad_id == olympiad_id,
            OlympiadParticipant.student_id == sp.id,
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    )
    participant = p_res.scalars().first()
    if not participant:
        raise HTTPException(status_code=404, detail="Natija topilmadi yoki hali tugallanmagan")

    # Get answers
    a_res = await db.execute(
        select(OlympiadAnswer).where(OlympiadAnswer.participant_id == participant.id)
    )
    answers_list = a_res.scalars().all()

    # Batch-load question metadata (fixes N+1)
    question_ids = list({a.question_id for a in answers_list if a.question_id})
    questions_map: dict = {}
    if question_ids:
        q_res = await db.execute(
            select(OlympiadQuestion).where(OlympiadQuestion.id.in_(question_ids))
        )
        questions_map = {q.id: q for q in q_res.scalars().all()}

    answer_details = []
    for a in answers_list:
        q = questions_map.get(a.question_id)
        answer_details.append({
            "question_id": a.question_id,
            "question_text": q.question_text if q else "",
            "options": q.options if q else [],
            "selected_answer": a.selected_answer,
            "correct_answer": q.correct_answer if q else None,
            "is_correct": a.is_correct,
        })

    return {
        "success": True,
        "data": {
            "score": participant.total_score,
            "correct_answers": participant.correct_answers,
            "wrong_answers": participant.wrong_answers,
            "answers": answer_details
        }
    }





# ============= SMT-1: AI Evaluation & Analytics =============

@router.get("/my-analytics/insights")
async def get_my_analytics(
    student_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Get AI evaluation and analytics of a student's olympiad history"""
    user_id = resolve_auth_user_id(student_id, auth_user_id)

    sp = await _resolve_student_profile(user_id, db)
    if not sp:
        raise HTTPException(status_code=404, detail="Profil topilmadi")

    # Fetch user's completed participations
    p_res = await db.execute(
        select(OlympiadParticipant)
        .where(
            OlympiadParticipant.student_id == sp.id, 
            OlympiadParticipant.status == ParticipationStatus.completed
        )
        .order_by(OlympiadParticipant.completed_at.asc())
    )
    participations = p_res.scalars().all()
    
    if not participations:
        return {
            "success": True,
            "data": {
                "has_data": False,
                "message": "Sizda hali olimpiada natijalari yo'q. Tahlil qilish uchun ko'proq ishtirok eting!"
            }
        }
    
    total_quizzes = len(participations)
    total_score = sum(p.total_score for p in participations)
    average_score = total_score / total_quizzes

    # Batch-load olympiad titles (fixes N+1 inside the progress_data loop)
    olympiad_ids = list({p.olympiad_id for p in participations if p.olympiad_id})
    olympiads_map: dict = {}
    if olympiad_ids:
        o_res = await db.execute(select(Olympiad).where(Olympiad.id.in_(olympiad_ids)))
        olympiads_map = {o.id: o for o in o_res.scalars().all()}

    progress_data = []
    for p in participations:
        olympiad = olympiads_map.get(p.olympiad_id)
        total_questions = p.correct_answers + p.wrong_answers
        percentage = (p.correct_answers / total_questions * 100) if total_questions > 0 else 0
        progress_data.append({
            "date": p.completed_at.strftime("%Y-%m-%d") if p.completed_at else "",
            "score": p.total_score,
            "percentage": percentage,
            "title": olympiad.title if olympiad else "Olimpiada"
        })
        
    recent_participation = participations[-1]
    recent_total_questions = recent_participation.correct_answers + recent_participation.wrong_answers
    recent_percentage = (recent_participation.correct_answers / recent_total_questions * 100) if recent_total_questions > 0 else 0
    
    insights = []
    if recent_percentage >= 80:
        insights.append("Sizning oxirgi natijangiz juda yaxshi! Shu tarzda davom eting. 🌟")
        insights.append("Murakkabroq (Qiyin) olimpiadalarda o'zingizni sinab ko'rishni tavsiya qilamiz.")
    elif recent_percentage >= 50:
        insights.append("O'rtacha natija ko'rsatdingiz. Ba'zi mavzularni takrorlash foydali bo'ladi. 📚")
    else:
        insights.append("Natijalarni yaxshilash ustida izchil ishlash kerak. Oldingi xatolaringizni ko'rib chiqing. 💡")
        
    if total_quizzes >= 3:
        mid_point = total_quizzes // 2
        first_half_avg = sum(p.total_score for p in participations[:mid_point]) / mid_point
        second_half_avg = sum(p.total_score for p in participations[mid_point:]) / (total_quizzes - mid_point)
        
        if second_half_avg > first_half_avg:
            insights.append("Trend tahlili: Sizning natijalaringiz vaqt o'tishi bilan o'sib bormoqda! 📈")
        elif second_half_avg < first_half_avg:
            insights.append("Trend tahlili: So'nggi paytlarda natijalaringiz biroz pasaygan. Diqqatni jamlang! 📉")
            
    total_time = sum(p.time_spent_seconds for p in participations)
    total_qs = sum(p.correct_answers + p.wrong_answers for p in participations)
    avg_time_per_q = total_time / total_qs if total_qs > 0 else 0
    
    return {
        "success": True,
        "data": {
            "has_data": True,
            "total_participations": total_quizzes,
            "average_score": round(average_score, 1),
            "avg_time_per_question": round(avg_time_per_q, 1),
            "insights": insights,
            "progress_chart": progress_data[-10:] # Return last 10 entries for chart
        }
    }


# ============= Admin: Analytics Dashboard =============

@router.get("/admin/analytics/overview")
async def admin_analytics_overview(
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """ADM-1: Aggregated analytics for admin dashboard"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Total students
    total_students = (await db.execute(
        select(sql_func.count(StudentProfile.id))
    )).scalar() or 0

    # Total olympiads
    total_olympiads = (await db.execute(
        select(sql_func.count(Olympiad.id))
    )).scalar() or 0

    # Active olympiads
    active_olympiads = (await db.execute(
        select(sql_func.count(Olympiad.id)).where(Olympiad.status == OlympiadStatus.active)
    )).scalar() or 0

    # Total participations
    total_participations = (await db.execute(
        select(sql_func.count(OlympiadParticipant.id))
    )).scalar() or 0

    # Completed participations
    completed_participations = (await db.execute(
        select(sql_func.count(OlympiadParticipant.id)).where(
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    )).scalar() or 0

    completion_rate = round((completed_participations / total_participations * 100), 1) if total_participations > 0 else 0

    # Average score
    avg_score_result = (await db.execute(
        select(sql_func.avg(OlympiadParticipant.total_score)).where(
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    )).scalar()
    avg_score = round(float(avg_score_result), 1) if avg_score_result else 0

    # Score distribution (0-25, 25-50, 50-75, 75-100)
    all_completed = (await db.execute(
        select(OlympiadParticipant.total_score).where(
            OlympiadParticipant.status == ParticipationStatus.completed
        )
    )).scalars().all()

    score_distribution = {"0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0}
    for score in all_completed:
        if score is None:
            continue
        pct = score  # Assume score is already a percentage or adjust as needed
        if pct < 25:
            score_distribution["0-25"] += 1
        elif pct < 50:
            score_distribution["25-50"] += 1
        elif pct < 75:
            score_distribution["50-75"] += 1
        else:
            score_distribution["75-100"] += 1

    # Top 5 olympiads by participation
    top_olympiads_query = (
        select(
            Olympiad.title,
            sql_func.count(OlympiadParticipant.id).label("participants_count")
        )
        .join(OlympiadParticipant, OlympiadParticipant.olympiad_id == Olympiad.id)
        .group_by(Olympiad.id, Olympiad.title)
        .order_by(sql_func.count(OlympiadParticipant.id).desc())
        .limit(5)
    )
    top_olympiads = (await db.execute(top_olympiads_query)).all()

    return {
        "success": True,
        "data": {
            "total_students": total_students,
            "total_olympiads": total_olympiads,
            "active_olympiads": active_olympiads,
            "total_participations": total_participations,
            "completed_participations": completed_participations,
            "completion_rate": completion_rate,
            "average_score": avg_score,
            "score_distribution": score_distribution,
            "top_olympiads": [
                {"title": t[0], "participants": t[1]} for t in top_olympiads
            ]
        }
    }


@router.post("/admin/build")
async def admin_build_olympiad(
    payload: BuilderPayload,
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """ADM-4: Backend endpoint for new Olympiad Builder"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Always create as draft — admin publishes separately
    now = datetime.now(timezone.utc)
    start = payload.start_date.replace(tzinfo=timezone.utc) if payload.start_date.tzinfo is None else payload.start_date
    status = OlympiadStatus.draft

    # 1. Create Olympiad
    new_olympiad = Olympiad(
        title=payload.title,
        description=payload.description,
        subject=OlympiadSubject.general, # default
        type=OlympiadType.test,
        registration_start=now - timedelta(days=1), # Avtomatik ro'yxatdan o'tishni ochish (kecha)
        registration_end=start,
        start_time=start,
        end_time=payload.end_date.replace(tzinfo=timezone.utc) if payload.end_date.tzinfo is None else payload.end_date,
        duration_minutes=payload.time_limit_minutes,
        max_participants=5000,
        questions_count=len(payload.questions),
        status=status,
        difficulty=payload.difficulty,
        min_age=payload.min_age,
        max_age=payload.max_age,
        banner_image=payload.banner_image,
    )
    db.add(new_olympiad)
    await db.flush() # get ID

    # 2. Add Questions
    for q_item in payload.questions:
        q = OlympiadQuestion(
            olympiad_id=new_olympiad.id,
            question_text=q_item.question_text,
            options=q_item.options,
            correct_answer=q_item.correct_option_index,  # Bug fix: DB column is correct_answer not correct_option_index
            points=q_item.points,
            order=q_item.order_index  # Bug fix: DB column is 'order' not 'order_index'
        )
        db.add(q)
        
    await db.commit()
    
    return {"success": True, "olympiad_id": new_olympiad.id, "message": "Olympiad built successfully (draft)"}


# ============= Admin: Draft Olympiad Management =============

class QuestionPayload(BaseModel):
    question_text: str
    options: List[str]
    correct_option_index: int
    points: int = 5
    order_index: int = 0


class OlympiadUpdatePayload(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    difficulty: Optional[str] = None
    min_age: Optional[int] = Field(default=None, ge=1, le=100)
    max_age: Optional[int] = Field(default=None, ge=1, le=100)
    status: Optional[str] = None
    banner_image: Optional[str] = None

    @field_validator("banner_image")
    @classmethod
    def validate_banner(cls, v):
        return _validate_banner_url(v)

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        if v is not None and v not in ("easy", "medium", "hard"):
            raise ValueError("difficulty faqat 'easy', 'medium' yoki 'hard' bo'lishi mumkin")
        return v


@router.get("/admin/olympiads")
async def admin_list_olympiads(
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """List all olympiads including drafts (admin only)"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.execute(select(Olympiad).order_by(Olympiad.created_at.desc()))
    olympiads = result.scalars().all()

    out = []
    for o in olympiads:
        d = _olympiad_to_dict(o)
        q_count = (await db.execute(
            select(sql_func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == o.id)
        )).scalar() or 0
        d["questions_count"] = q_count
        out.append(d)

    return {"success": True, "data": {"olympiads": out}}


@router.get("/admin/olympiads/{olympiad_id}")
async def admin_get_olympiad(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """Get olympiad with all questions (admin only)"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    q_res = await db.execute(
        select(OlympiadQuestion)
        .where(OlympiadQuestion.olympiad_id == olympiad_id)
        .order_by(OlympiadQuestion.order)
    )
    questions = q_res.scalars().all()

    d = _olympiad_to_dict(olympiad)
    d["questions"] = [_question_to_dict(q) for q in questions]
    return {"success": True, "data": d}


@router.put("/admin/olympiads/{olympiad_id}")
async def admin_update_olympiad(
    olympiad_id: str,
    payload: OlympiadUpdatePayload,
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """Update olympiad info or publish it (admin only)"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    if payload.title is not None:
        olympiad.title = payload.title
    if payload.description is not None:
        olympiad.description = payload.description
    if payload.start_date is not None:
        olympiad.start_time = payload.start_date.replace(tzinfo=timezone.utc) if payload.start_date.tzinfo is None else payload.start_date
    if payload.end_date is not None:
        olympiad.end_time = payload.end_date.replace(tzinfo=timezone.utc) if payload.end_date.tzinfo is None else payload.end_date
    if payload.time_limit_minutes is not None:
        olympiad.duration_minutes = payload.time_limit_minutes
    if payload.difficulty is not None:
        olympiad.difficulty = payload.difficulty
    if payload.min_age is not None:
        olympiad.min_age = payload.min_age
    if payload.max_age is not None:
        olympiad.max_age = payload.max_age
    if payload.banner_image is not None:
        olympiad.banner_image = payload.banner_image if payload.banner_image else None
    if payload.status is not None:
        try:
            olympiad.status = OlympiadStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Noto'g'ri holat: {payload.status}")

    await db.commit()
    return {"success": True, "message": "Olimpiada yangilandi"}


@router.post("/admin/olympiads/{olympiad_id}/questions")
async def admin_add_question(
    olympiad_id: str,
    payload: QuestionPayload,
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """Add a question to an existing olympiad (admin only)"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    q = OlympiadQuestion(
        olympiad_id=olympiad_id,
        question_text=payload.question_text,
        options=payload.options,
        correct_answer=payload.correct_option_index,
        points=payload.points,
        order=payload.order_index,
    )
    db.add(q)
    await db.flush()  # Flush to get the new question in DB

    # Update questions_count after flush (now includes the new question)
    res2 = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res2.scalars().first()
    count = (await db.execute(
        select(sql_func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == olympiad_id)
    )).scalar() or 0
    olympiad.questions_count = count

    await db.commit()
    await db.refresh(q)
    return {"success": True, "question": _question_to_dict(q)}


@router.put("/admin/olympiads/{olympiad_id}/questions/{question_id}")
async def admin_update_question(
    olympiad_id: str,
    question_id: str,
    payload: QuestionPayload,
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """Edit a question in an olympiad (admin only)"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

    res = await db.execute(
        select(OlympiadQuestion).where(
            OlympiadQuestion.id == question_id,
            OlympiadQuestion.olympiad_id == olympiad_id
        )
    )
    q = res.scalars().first()
    if not q:
        raise HTTPException(status_code=404, detail="Savol topilmadi")

    q.question_text = payload.question_text
    q.options = payload.options
    q.correct_answer = payload.correct_option_index
    q.points = payload.points
    q.order = payload.order_index

    await db.commit()
    return {"success": True, "question": _question_to_dict(q)}


@router.delete("/admin/olympiads/{olympiad_id}/questions/{question_id}")
async def admin_delete_question(
    olympiad_id: str,
    question_id: str,
    db: AsyncSession = Depends(get_db),
    admin_key: str = Header(None, alias="X-Admin-Key")
):
    """Delete a question from an olympiad (admin only)"""
    if admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin access required")

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
    await db.flush()  # Flush to remove the question from DB

    # Update questions_count after flush (now excludes the deleted question)
    res2 = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res2.scalars().first()
    if olympiad:
        count = (await db.execute(
            select(sql_func.count(OlympiadQuestion.id)).where(OlympiadQuestion.olympiad_id == olympiad_id)
        )).scalar() or 0
        olympiad.questions_count = count

    await db.commit()
    return {"success": True, "message": "Savol o'chirildi"}


# ============= Winner email helper =============

def _send_smtp_email_sync(to: str, subject: str, html_body: str) -> bool:
    """Send a single email via stdlib smtplib. Blocking — wrap in to_thread.

    Returns True on success, False on failure. Never raises.
    """
    if not settings.MAIL_ENABLED:
        logger.info("MAIL_ENABLED=false; would send '%s' to %s", subject, to)
        return True
    if not (settings.MAIL_USERNAME and settings.MAIL_PASSWORD):
        logger.warning("MAIL credentials missing — skipping email to %s", to)
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
        msg["To"] = to
        msg.set_content("Bu maktubni HTML'ni qo'llab-quvvatlaydigan klientda oching.")
        msg.add_alternative(html_body, subtype="html")

        if settings.MAIL_USE_SSL:
            with smtplib.SMTP_SSL(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=15) as server:
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=15) as server:
                server.starttls()
                server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                server.send_message(msg)
        logger.info("winner email sent to %s (subject=%s)", to, subject)
        return True
    except Exception as e:
        logger.warning("winner email to %s failed: %s", to, e)
        return False


def _winner_email_html(full_name: str, olympiad_title: str, rank: int, coins: int) -> str:
    rank_label = {1: "1-o'rin", 2: "2-o'rin", 3: "3-o'rin"}.get(rank, f"{rank}-o'rin")
    medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(rank, "🏆")
    return f"""\
<html><body style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="color:#2563eb;margin-top:0">{medal} Tabriklaymiz, {full_name}!</h1>
    <p style="font-size:16px;color:#111">
      Siz <strong>{olympiad_title}</strong> olimpiadasida
      <strong>{rank_label}</strong> ni egalladingiz.
    </p>
    <p style="font-size:16px;color:#111">
      Mukofot sifatida hisobingizga <strong>{coins} tanga</strong> qo'shildi.
      Tanga do'koniga kirib, sovg'alarni tanlashingiz mumkin.
    </p>
    <p style="font-size:14px;color:#555;margin-top:32px">
      Alif24 jamoasi sizni ushbu yutuq bilan qutlaydi va yangi bosqichlarda muvaffaqiyat tilaydi!
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="font-size:12px;color:#888">
      Bu avtomatik xabar. Javob yozish shart emas.
    </p>
  </div>
</body></html>"""


async def _resolve_winner_emails(
    db: AsyncSession,
    winners: list[dict],
) -> list[dict]:
    """Hydrate winner rows with {email, full_name} using the live request
    DB session. Returns only winners that have a valid email. Caller should
    invoke this BEFORE handing the list off to a background task (the db
    session is request-scoped and will close after the response).
    """
    if not winners:
        return []
    student_ids = [w["student_id"] for w in winners]
    res = await db.execute(
        select(StudentProfile, User)
        .join(User, StudentProfile.user_id == User.id)
        .where(StudentProfile.id.in_(student_ids))
    )
    user_by_student: dict[str, tuple[str, str]] = {}
    for sp, u in res.all():
        full_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or "Hurmatli o'quvchi"
        email = (u.email or "").strip()
        if email:
            user_by_student[sp.id] = (email, full_name)

    hydrated = []
    for w in winners:
        data = user_by_student.get(w["student_id"])
        if not data:
            continue
        email, name = data
        hydrated.append({**w, "email": email, "full_name": name})
    return hydrated


async def _send_winner_emails_bg(olympiad_title: str, winners: list[dict]) -> None:
    """Run SMTP sends concurrently off the request thread."""
    tasks = []
    for w in winners:
        html = _winner_email_html(w["full_name"], olympiad_title, w["rank"], w["amount"])
        subject = f"Tabriklaymiz! {olympiad_title} — {w['rank']}-o'rin mukofoti"
        tasks.append(asyncio.to_thread(_send_smtp_email_sync, w["email"], subject, html))
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


# ============= Admin: Audit log helper =============

async def _audit(
    db: AsyncSession,
    *,
    admin_role: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None,
    action_type: str = "info",
) -> None:
    """Persist an AuditLog row. Never raises — audit failures must not
    break the parent request. Callers must still `await db.commit()`.
    """
    try:
        ip = None
        if request is not None:
            # FastAPI stores the client peer in request.client; proxies may set
            # X-Forwarded-For which we prefer when present.
            xff = request.headers.get("x-forwarded-for")
            if xff:
                ip = xff.split(",")[0].strip()
            elif request.client:
                ip = request.client.host
        db.add(AuditLog(
            admin_role=admin_role[:20],
            action=action[:50],
            action_type=action_type[:20],
            target_type=(target_type or None),
            target_id=(target_id or None),
            target_name=(target_name or None),
            details=details or None,
            ip_address=ip,
        ))
    except Exception as e:
        logger.warning("audit write failed (action=%s): %s", action, e)


def _admin_role_from_headers(request: Request) -> str:
    """Extract the label from X-Admin-Role header; unknown roles collapse to 'admin'."""
    role = (request.headers.get("x-admin-role") or "admin").lower().strip()
    return role if role in {"hazratqul", "nurali", "pedagog", "admin", "system"} else "admin"


# ============= Admin: Pause / resume / invalidate question =============

class PausePayload(BaseModel):
    reason: Optional[str] = None


@router.post("/admin/olympiads/{olympiad_id}/pause")
async def admin_pause_olympiad(
    olympiad_id: str,
    payload: PausePayload = PausePayload(),
    request: Request = None,  # type: ignore
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Freeze an olympiad temporarily (e.g. network outage). Flips status to
    `draft` which makes the Phase-1 submit gate reject new submissions.
    Active participants still see their timers; they resume on /resume.

    Stored in audit_logs with reason.
    """
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id).with_for_update())
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")
    if olympiad.status == OlympiadStatus.finished:
        raise HTTPException(status_code=400, detail="Yakunlangan olimpiadani pauza qilib bo'lmaydi")

    prev_status = olympiad.status.value if olympiad.status else None
    olympiad.status = OlympiadStatus.draft

    await _audit(
        db,
        admin_role=_admin_role_from_headers(request) if request else "admin",
        action="olympiad.pause",
        action_type="warning",
        target_type="olympiad",
        target_id=olympiad.id,
        target_name=olympiad.title,
        details={"reason": payload.reason, "prev_status": prev_status},
        request=request,
    )
    await db.commit()
    return {"success": True, "data": {"olympiad_id": olympiad.id, "status": olympiad.status.value}}


class ResumePayload(BaseModel):
    # Extend end_time by this many minutes to compensate for lost time.
    extend_minutes: int = 0


@router.post("/admin/olympiads/{olympiad_id}/resume")
async def admin_resume_olympiad(
    olympiad_id: str,
    payload: ResumePayload = ResumePayload(),
    request: Request = None,  # type: ignore
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Un-pause. Optionally bump end_time to compensate for downtime."""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id).with_for_update())
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")
    if olympiad.status == OlympiadStatus.finished:
        raise HTTPException(status_code=400, detail="Yakunlangan olimpiadani qayta ochib bo'lmaydi")

    prev_status = olympiad.status.value if olympiad.status else None
    olympiad.status = OlympiadStatus.active

    extended_to = None
    if payload.extend_minutes and payload.extend_minutes > 0 and olympiad.end_time:
        olympiad.end_time = olympiad.end_time + timedelta(minutes=payload.extend_minutes)
        extended_to = olympiad.end_time.isoformat()

    await _audit(
        db,
        admin_role=_admin_role_from_headers(request) if request else "admin",
        action="olympiad.resume",
        action_type="info",
        target_type="olympiad",
        target_id=olympiad.id,
        target_name=olympiad.title,
        details={
            "prev_status": prev_status,
            "extend_minutes": payload.extend_minutes,
            "new_end_time": extended_to,
        },
        request=request,
    )
    await db.commit()
    return {
        "success": True,
        "data": {
            "olympiad_id": olympiad.id,
            "status": olympiad.status.value,
            "end_time": olympiad.end_time.isoformat() if olympiad.end_time else None,
        },
    }


class InvalidateQuestionPayload(BaseModel):
    # What to do with answers of the invalidated question:
    # "credit_all"  — give everyone full points (safe default, fair)
    # "zero_all"    — award 0 points to everyone
    # "skip"        — leave answer rows untouched, just hide the question going forward
    mode: str = "credit_all"
    reason: Optional[str] = None


@router.post("/admin/olympiads/{olympiad_id}/questions/{question_id}/invalidate")
async def admin_invalidate_question(
    olympiad_id: str,
    question_id: str,
    payload: InvalidateQuestionPayload = InvalidateQuestionPayload(),
    request: Request = None,  # type: ignore
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Invalidate a question after submissions started (typo, ambiguous, etc.).

    Rescores participants' `total_score` in place according to `mode`.
    Logged in audit_logs.
    """
    if payload.mode not in {"credit_all", "zero_all", "skip"}:
        raise HTTPException(status_code=400, detail="mode must be credit_all | zero_all | skip")

    q_res = await db.execute(
        select(OlympiadQuestion).where(
            OlympiadQuestion.id == question_id,
            OlympiadQuestion.olympiad_id == olympiad_id,
        )
    )
    question = q_res.scalars().first()
    if not question:
        raise HTTPException(status_code=404, detail="Savol topilmadi")

    # Find every answer to this question, grouped by participant, to know
    # who currently has it marked correct/wrong.
    ans_res = await db.execute(
        select(OlympiadAnswer).where(OlympiadAnswer.question_id == question_id)
    )
    answers = list(ans_res.scalars().all())

    q_points = int(question.points or 1)
    affected = 0

    if payload.mode in {"credit_all", "zero_all"}:
        target_correct = payload.mode == "credit_all"

        # Collect participant ids to rescore efficiently.
        participant_ids = {a.participant_id for a in answers}

        for ans in answers:
            prev_correct = bool(ans.is_correct)
            prev_points = int(ans.points_earned or 0)

            ans.is_correct = target_correct
            ans.points_earned = q_points if target_correct else 0

            delta = ans.points_earned - prev_points
            if delta != 0:
                # Update participant.total_score incrementally.
                p_res = await db.execute(
                    select(OlympiadParticipant).where(OlympiadParticipant.id == ans.participant_id)
                )
                p = p_res.scalars().first()
                if p is not None:
                    p.total_score = int(p.total_score or 0) + delta
                    affected += 1

    await _audit(
        db,
        admin_role=_admin_role_from_headers(request) if request else "admin",
        action="question.invalidate",
        action_type="danger",
        target_type="question",
        target_id=question.id,
        target_name=(question.question_text or "")[:200],
        details={
            "olympiad_id": olympiad_id,
            "mode": payload.mode,
            "reason": payload.reason,
            "answers_affected": len(answers),
            "scores_changed": affected,
        },
        request=request,
    )
    await db.commit()
    return {
        "success": True,
        "data": {
            "question_id": question.id,
            "mode": payload.mode,
            "answers_affected": len(answers),
            "scores_changed": affected,
        },
    }


# ============= Admin: Finalize olympiad =============

class FinalizePayload(BaseModel):
    # If True, rewrite ranks from scratch even if some participants already have rank set.
    rewrite_ranks: bool = True
    # If True, award prize coins to top-3 (first/second/third). Idempotent — per-participant
    # `meta_data.finalized_prize` flag prevents double-awards on retry.
    award_prizes: bool = True


@router.post("/admin/olympiads/{olympiad_id}/finalize")
async def admin_finalize_olympiad(
    olympiad_id: str,
    payload: FinalizePayload = FinalizePayload(),
    request: Request = None,  # type: ignore
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Mark an olympiad as finished, assign final ranks, award top-3 prize coins.

    Safe to call twice — the prize-award side is idempotent: before awarding
    we check CoinTransaction for an existing row with the same
    (student_coin_id, reference_id=olympiad.id, type=olympiad_first/second/third).
    If you re-rank after a score fix, stale prizes from displaced winners
    are NOT clawed back automatically (that would be a destructive op); the
    endpoint returns details so an admin can reconcile manually if needed.

    Only participants with status == completed are considered. Ties on
    `total_score` are broken by `time_spent_seconds` (less = better), then
    `completed_at` (earlier = better).
    """
    res = await db.execute(
        select(Olympiad)
        .where(Olympiad.id == olympiad_id)
        .with_for_update()
    )
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    # Load finished participants, ordered for ranking.
    p_res = await db.execute(
        select(OlympiadParticipant)
        .where(
            OlympiadParticipant.olympiad_id == olympiad.id,
            OlympiadParticipant.status == ParticipationStatus.completed,
        )
        .order_by(
            OlympiadParticipant.total_score.desc(),
            OlympiadParticipant.time_spent_seconds.asc().nulls_last(),
            OlympiadParticipant.completed_at.asc().nulls_last(),
        )
        .with_for_update()
    )
    participants = list(p_res.scalars().all())

    prize_map = {
        1: (settings.OLYMPIAD_PRIZE_COINS_FIRST, TransactionType.olympiad_first, "1-o'rin"),
        2: (settings.OLYMPIAD_PRIZE_COINS_SECOND, TransactionType.olympiad_second, "2-o'rin"),
        3: (settings.OLYMPIAD_PRIZE_COINS_THIRD, TransactionType.olympiad_third, "3-o'rin"),
    }

    prizes_awarded: list[dict] = []
    ranked_count = 0

    for idx, p in enumerate(participants, start=1):
        if payload.rewrite_ranks or p.rank is None:
            p.rank = idx
            ranked_count += 1

        if payload.award_prizes and idx in prize_map:
            amount, tx_type, label = prize_map[idx]

            # Idempotency: has THIS student already received THIS tx_type for THIS olympiad?
            dup_res = await db.execute(
                select(CoinTransaction.id)
                .join(StudentCoin, CoinTransaction.student_coin_id == StudentCoin.id)
                .where(
                    StudentCoin.student_id == p.student_id,
                    CoinTransaction.type == tx_type,
                    CoinTransaction.reference_id == olympiad.id,
                )
                .limit(1)
            )
            if dup_res.scalars().first():
                prizes_awarded.append({
                    "participant_id": p.id,
                    "student_id": p.student_id,
                    "rank": idx,
                    "amount": amount,
                    "status": "already_awarded",
                })
                continue

            try:
                await _award_coins(
                    student_id=p.student_id,
                    amount=amount,
                    tx_type=tx_type,
                    description=f"Olimpiada {label}: {olympiad.title}",
                    reference_id=olympiad.id,
                    reference_type="olympiad_finalize",
                    db=db,
                )
                prizes_awarded.append({
                    "participant_id": p.id,
                    "student_id": p.student_id,
                    "rank": idx,
                    "amount": amount,
                    "status": "awarded",
                })
            except Exception as e:
                logger.error(
                    "finalize: failed to award rank %s prize to %s: %s",
                    idx, p.student_id, e,
                )
                prizes_awarded.append({
                    "participant_id": p.id,
                    "student_id": p.student_id,
                    "rank": idx,
                    "amount": amount,
                    "status": f"error:{e}",
                })

    olympiad.status = OlympiadStatus.finished
    if not olympiad.end_time or olympiad.end_time > datetime.now(timezone.utc):
        # Force end_time to "now" so late submissions are rejected immediately.
        olympiad.end_time = datetime.now(timezone.utc)

    await _audit(
        db,
        admin_role=_admin_role_from_headers(request) if request else "admin",
        action="olympiad.finalize",
        action_type="danger",
        target_type="olympiad",
        target_id=olympiad.id,
        target_name=olympiad.title,
        details={
            "rewrite_ranks": payload.rewrite_ranks,
            "award_prizes": payload.award_prizes,
            "total_finished": len(participants),
            "ranked_count": ranked_count,
            "prizes_awarded": prizes_awarded,
        },
        request=request,
    )

    # Hydrate winner contact info BEFORE commit — we need the live session.
    newly_awarded = [p for p in prizes_awarded if p.get("status") == "awarded"]
    hydrated_winners: list[dict] = []
    if newly_awarded:
        try:
            hydrated_winners = await _resolve_winner_emails(db, newly_awarded)
        except Exception as e:
            logger.warning("finalize: winner email hydration failed: %s", e)

    await db.commit()

    try:
        await manager.broadcast(olympiad.id, {"type": "leaderboard_update", "final": True})
    except Exception:
        pass

    # Fire-and-forget winner emails. Background SMTP so the admin's HTTP
    # response doesn't block on 3x Gmail round-trips.
    if hydrated_winners:
        asyncio.create_task(_send_winner_emails_bg(olympiad.title, hydrated_winners))

    return {
        "success": True,
        "data": {
            "olympiad_id": olympiad.id,
            "status": olympiad.status.value,
            "ranked_participants": ranked_count,
            "total_finished": len(participants),
            "prizes_awarded": prizes_awarded,
        },
    }


# ============= Olympiad Content: Lessons & Stories =============

@router.get("/{olympiad_id}/content/lessons")
async def get_olympiad_lessons(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all lessons for a specific olympiad"""
    res = await db.execute(
        select(OlympiadLesson).where(
            OlympiadLesson.olympiad_id == olympiad_id,
            OlympiadLesson.is_published == True
        )
        .order_by(OlympiadLesson.created_at.desc())
    )
    lessons = res.scalars().all()
    return {
        "success": True,
        "data": [{
            "id": l.id, "olympiad_id": l.olympiad_id, "title": l.title,
            "subject": l.subject, "content": l.content, "grade_level": l.grade_level,
            "language": l.language, "video_url": l.video_url,
            "attachments": l.attachments or [],
            "created_at": l.created_at.isoformat() if l.created_at else None,
        } for l in lessons]
    }


@router.get("/{olympiad_id}/content/lessons/{lesson_id}")
async def get_olympiad_lesson(
    olympiad_id: str,
    lesson_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single lesson for a specific olympiad"""
    res = await db.execute(
        select(OlympiadLesson).where(
            OlympiadLesson.id == lesson_id,
            OlympiadLesson.olympiad_id == olympiad_id
        )
    )
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    return {
        "success": True,
        "data": {
            "id": lesson.id, "olympiad_id": lesson.olympiad_id, "title": lesson.title,
            "subject": lesson.subject, "content": lesson.content, "grade_level": lesson.grade_level,
            "language": lesson.language, "video_url": lesson.video_url,
            "attachments": lesson.attachments or [],
            "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
        }
    }


@router.post("/{olympiad_id}/content/lessons")
async def create_olympiad_lesson(
    olympiad_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Admin: Create a lesson for this olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")
    lesson = OlympiadLesson(
        olympiad_id=olympiad_id,
        title=data.get("title", ""),
        subject=data.get("subject"),
        content=data.get("content"),
        grade_level=data.get("grade_level"),
        language=data.get("language", "uz"),
        video_url=data.get("video_url"),
        attachments=data.get("attachments"),
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return {"success": True, "data": {"id": lesson.id, "title": lesson.title}}


@router.put("/{olympiad_id}/content/lessons/{lesson_id}")
async def update_olympiad_lesson(
    olympiad_id: str,
    lesson_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Admin: Update a lesson"""
    res = await db.execute(
        select(OlympiadLesson).where(
            OlympiadLesson.id == lesson_id,
            OlympiadLesson.olympiad_id == olympiad_id
        )
    )
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    for field in ["title", "subject", "content", "grade_level", "language", "video_url", "attachments"]:
        if field in data:
            setattr(lesson, field, data[field])
    await db.commit()
    return {"success": True, "data": {"id": lesson.id, "title": lesson.title}}


@router.delete("/{olympiad_id}/content/lessons/{lesson_id}")
async def delete_olympiad_lesson(
    olympiad_id: str,
    lesson_id: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Admin: Delete a lesson"""
    res = await db.execute(
        select(OlympiadLesson).where(
            OlympiadLesson.id == lesson_id,
            OlympiadLesson.olympiad_id == olympiad_id
        )
    )
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    await db.delete(lesson)
    await db.commit()
    return {"success": True, "message": "O'chirildi"}


@router.get("/{olympiad_id}/content/stories")
async def get_olympiad_stories(
    olympiad_id: str,
    student_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all stories (ertaklar) for a specific olympiad"""
    res = await db.execute(
        select(OlympiadStory).where(
            OlympiadStory.olympiad_id == olympiad_id,
            OlympiadStory.is_published == True
        )
        .order_by(OlympiadStory.created_at.desc())
    )
    stories = res.scalars().all()
    
    subs_map = {}
    global_quiz_result = None
    
    if student_id:
        sp = await _resolve_student_profile(student_id, db)
        resolved_student_id = sp.id if sp else str(student_id)
        p_res = await db.execute(
            select(OlympiadParticipant).where(
                OlympiadParticipant.olympiad_id == olympiad_id,
                OlympiadParticipant.student_id == resolved_student_id
            )
        )
        participant = p_res.scalars().first()
        if participant:
            sub_res = await db.execute(
                select(OlympiadReadingSubmission).where(
                    OlympiadReadingSubmission.participant_id == participant.id
                )
            )
            for sub in sub_res.scalars().all():
                obj = {
                    "wpm": sub.words_per_minute or 0,
                    "read_percent": sub.read_percent or 0,
                    "reading_time_seconds": sub.reading_duration_seconds or 0,
                    "quiz_score": sub.comprehension_score or 0,
                    "earned_coins": sub.earned_coins or 0,
                    "correct_answers": sub.comprehension_score or 0,
                    "total_questions": sub.comprehension_total or 0,
                    "total_points": sub.total_points or 0,
                    "answers": sub.comprehension_answers or [],
                }
                if sub.story_id is not None:
                    subs_map[str(sub.story_id)] = obj
                elif sub.reading_task_id is not None:
                    subs_map[str(sub.reading_task_id)] = obj
                else:
                    global_quiz_result = obj

    return {
        "success": True,
        "data": {
            "global_quiz_result": global_quiz_result,
            "ertaklar": [{
                "id": s.id, "olympiad_id": s.olympiad_id, "title": s.title,
                "content": s.content, "language": s.language, "age_group": s.age_group,
                "has_audio": s.has_audio, "audio_url": s.audio_url,
                "image_url": s.image_url, "view_count": s.view_count,
                "questions": s.questions or [],
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "student_result": subs_map.get(str(s.id))
            } for s in stories]
        }
    }


@router.post("/{olympiad_id}/content/stories")
async def create_olympiad_story(
    olympiad_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Admin: Create a story for this olympiad"""
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")
    story = OlympiadStory(
        olympiad_id=olympiad_id,
        title=data.get("title", ""),
        content=data.get("content", ""),
        language=data.get("language", "uz"),
        age_group=data.get("age_group", "6-8"),
        has_audio=bool(data.get("audio_url")),
        audio_url=data.get("audio_url"),
        image_url=data.get("image_url"),
        questions=data.get("questions", []),
    )
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return {"success": True, "data": {"id": story.id, "title": story.title}}


@router.delete("/{olympiad_id}/content/stories/{story_id}")
async def delete_olympiad_story(
    olympiad_id: str,
    story_id: str,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_key),
):
    """Admin: Delete a story"""
    res = await db.execute(
        select(OlympiadStory).where(
            OlympiadStory.id == story_id,
            OlympiadStory.olympiad_id == olympiad_id
        )
    )
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    await db.delete(story)
    await db.commit()
    return {"success": True, "message": "O'chirildi"}


@router.post("/ertaklar/{story_id}/quiz/evaluate-text")
async def evaluate_story_quiz_text(
    story_id: str,
    question_index: int = Query(...),
    recognized_text: str = Form(...),
    student_id: Optional[str] = Query(None, description="Legacy: Student user_id (JWT preferred)"),
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """
    Ertak savol-javob baholash.
    Frontend'dan STT orqali olingan matn qabul qilinib,
    to'g'ri javob bilan 100 ballik shkalada solishtiriladi.
    """
    import os
    import difflib
    import httpx

    # Prefer JWT when present; fall back to legacy param for backward compat.
    user_id = auth_user_id or student_id
    if user_id:
        user_res = await db.execute(select(User).where(User.id == user_id))
        if not user_res.scalars().first():
            raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")

    res = await db.execute(
        select(OlympiadStory).where(OlympiadStory.id == story_id)
    )
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    questions = story.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Savol indeksi noto'g'ri")

    correct_answer = questions[question_index].get("answer", "").strip()
    question_text = questions[question_index].get("question", "").strip()
    recognized_clean = recognized_text.strip()

    # ── 1. AI-based evaluation (semantic similarity) ──
    api_key = os.getenv("OPENAI_API_KEY", "")
    score = None
    ai_used = False

    if api_key and recognized_clean and correct_answer:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                prompt = (
                    f"Savol: {question_text}\n"
                    f"To'g'ri javob: {correct_answer}\n"
                    f"Bola aytgan: {recognized_clean}\n\n"
                    "Bolaning javobi ma'nosi jihatidan to'g'ri javobga qanchalik mos kelishini "
                    "0 dan 100 gacha faqat bitta butun son bilan baholang. "
                    "100 = to'liq mos, 0 = mutlaqo noto'g'ri. "
                    "Faqat son qaytaring, boshqa hech narsa yozmang."
                )
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.0,
                        "max_tokens": 5,
                    }
                )
                if resp.status_code == 200:
                    raw = resp.json()["choices"][0]["message"]["content"].strip()
                    digits = "".join(filter(str.isdigit, raw))[:3]
                    score = max(0, min(100, int(digits or "0")))
                    ai_used = True
        except Exception as e:
            logger.warning(f"AI evaluation failed, falling back to difflib: {e}")

    # ── 2. Fallback: keyword + sequence matching ──
    if score is None:
        score = 0
        r_lower = recognized_clean.lower()
        c_lower = correct_answer.lower()
        if r_lower and c_lower:
            ratio = difflib.SequenceMatcher(None, r_lower, c_lower).ratio()
            correct_words = set(c_lower.split())
            recognized_words = set(r_lower.split())
            keyword_ratio = len(correct_words & recognized_words) / len(correct_words) if correct_words else 0
            # Scale to 0-100
            raw_score = (ratio * 0.5 + keyword_ratio * 0.5) * 100
            score = min(100, max(0, int(round(raw_score))))

    # Minimum 20 ball — bola nimadir javob bergan bo'lsa
    if recognized_clean and score < 20:
        score = 20

    return {
        "success": True,
        "data": {
            "recognized_text": recognized_clean,
            "correct_answer": correct_answer,
            "score": score,
            "passed": score >= 60,
            "ai_evaluated": ai_used,
        }
    }


# ============= Reading Olympiad: Submit Reading + Quiz Results =============

class ReadingQuizAnswer(BaseModel):
    question_id: str
    answer_index: int
    score: Optional[int] = None # 0-100 for AI/voice responses


class ReadingResultSubmit(BaseModel):
    # Legacy: User.id — optional when JWT is supplied (auth via cookie/Bearer).
    student_id: Optional[str] = None
    story_id: Optional[str] = None  # Yangi: qaysi ertak topshirildi?
    wpm: float = 0
    read_percent: float = 0
    reading_time_seconds: int = 0
    quiz_answers: List[ReadingQuizAnswer] = []
    quiz_score_direct: Optional[int] = None  # AI-evaluated score from voice quiz


@router.post("/{olympiad_id}/reading-submit")
async def submit_reading_result(
    olympiad_id: str,
    data: ReadingResultSubmit,
    db: AsyncSession = Depends(get_db),
    auth_user_id: Optional[str] = Depends(get_current_user_id_optional),
):
    """Submit combined reading + quiz result for a reading olympiad."""
    user_id = resolve_auth_user_id(data.student_id, auth_user_id)

    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    now = datetime.now(timezone.utc)
    if olympiad.status == OlympiadStatus.finished:
        raise HTTPException(
            status_code=400,
            detail="Olimpiada yakunlangan — natijalar muhrlangan, qabul qilinmaydi.",
        )
    if olympiad.end_time and now > olympiad.end_time + timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="Kechirasiz, musobaqa vaqti o'tib ketgan. Natija qabul qilinmaydi.")
    if olympiad.start_time and now < olympiad.start_time:
        raise HTTPException(status_code=400, detail="Kechirasiz, musobaqa hali boshlanmagan.")

    # Anti-cheat: story_id shu olimpiadaga tegishli bo'lishi shart
    # (aks holda boshqa olimpiadaning ertaklarini yuborib, coin farming qilib
    # bo'ladi). Both story (OlympiadStory) va reading_task (OlympiadReadingTask)
    # jadvallarini tekshiramiz.
    if data.story_id:
        belongs_res = await db.execute(
            select(OlympiadStory.id).where(
                OlympiadStory.id == data.story_id,
                OlympiadStory.olympiad_id == olympiad.id,
            )
        )
        if not belongs_res.scalars().first():
            task_res = await db.execute(
                select(OlympiadReadingTask.id).where(
                    OlympiadReadingTask.id == data.story_id,
                    OlympiadReadingTask.olympiad_id == olympiad.id,
                )
            )
            if not task_res.scalars().first():
                raise HTTPException(
                    status_code=400,
                    detail="Ushbu ertak/vazifa bu olimpiadaga tegishli emas.",
                )

    # Anti-cheat: client-supplied metrikalarni server-side cap qilamiz.
    # wpm, read_percent, reading_time_seconds — barisi klient qo'lida edi.
    original_wpm = float(data.wpm or 0)
    capped_wpm = max(0.0, min(original_wpm, float(settings.READING_MAX_WPM)))
    if original_wpm > settings.READING_MAX_WPM:
        logger.warning(
            "reading-submit: WPM cap applied (user=%s, wpm_sent=%.1f, capped=%.1f)",
            user_id, original_wpm, capped_wpm,
        )
    data.wpm = capped_wpm
    data.read_percent = max(0.0, min(float(data.read_percent or 0), settings.READING_MAX_READ_PERCENT))
    data.reading_time_seconds = max(0, int(data.reading_time_seconds or 0))

    # Ichki tezlik sanity: WPM deklaratsiyasi / actual reading_time_seconds
    # munosabati mantiqsiz bo'lsa — submit'ni rad qilamiz. (WPM cheatning eng
    # keng tarqalgan shakli: katta WPM + qisqa vaqt = imkonsiz tezlik.)
    if data.reading_time_seconds > 0 and data.wpm > 0:
        # 60 soniyada sarflanadigan so'zlar soni = wpm
        implied_words = (data.reading_time_seconds / 60.0) * data.wpm
        if implied_words > 0:
            seconds_per_word = data.reading_time_seconds / implied_words
            if seconds_per_word < settings.READING_MIN_SECONDS_PER_WORD:
                logger.warning(
                    "reading-submit: unrealistic pace rejected (user=%s, wpm=%.1f, dur=%ds)",
                    user_id, data.wpm, data.reading_time_seconds,
                )
                raise HTTPException(
                    status_code=400,
                    detail="O'qish tezligi haqiqiy emas ko'rinadi — iltimos, qaytadan urinib ko'ring.",
                )

    # Anti-cheat: AI voice quiz `score` klient-provided — unga ishonmaymiz.
    # Hozircha submit vaqtida rad qilamiz; server-side hisoblash to'g'ri
    # javob/option indeksidan amalga oshiriladi. Kelajakda evaluate-text
    # natijasini session-bound qilib saqlash kerak.
    if data.quiz_answers:
        for ans in data.quiz_answers:
            if ans.score is not None:
                logger.warning(
                    "reading-submit: client-supplied ans.score ignored (user=%s, q=%s)",
                    user_id, ans.question_id,
                )
                ans.score = None

    sp = await _resolve_student_profile(user_id, db)
    if not sp:
        raise HTTPException(status_code=404, detail="Profil topilmadi")

    # Row-lock to serialise concurrent submits from the same participant.
    p_res = await db.execute(
        select(OlympiadParticipant)
        .where(
            OlympiadParticipant.olympiad_id == olympiad.id,
            OlympiadParticipant.student_id == sp.id,
        )
        .with_for_update()
    )
    participant = p_res.scalars().first()
    if not participant:
        raise HTTPException(status_code=400, detail="Avval ro'yxatdan o'ting")

    # Once a participant is marked completed, further submits are denied
    # except for retakes of an already-scored story (which are handled
    # below via the `submission_existed` branch — no new coins, no rescore).

    # --- Check for existing submission first (to avoid duplicate scoring/coins) ---
    submission_existed = False
    submission = None
    if data.story_id:
        sub_res = await db.execute(
            select(OlympiadReadingSubmission).where(
                OlympiadReadingSubmission.participant_id == participant.id,
                or_(
                    OlympiadReadingSubmission.reading_task_id == data.story_id,
                    OlympiadReadingSubmission.story_id == data.story_id
                )
            )
        )
        submission = sub_res.scalars().first()
        submission_existed = submission is not None
    else:
        # Global Olympiad Test (no story_id)
        sub_res = await db.execute(
            select(OlympiadReadingSubmission).where(
                OlympiadReadingSubmission.participant_id == participant.id,
                OlympiadReadingSubmission.story_id == None,
                OlympiadReadingSubmission.reading_task_id == None
            )
        )
        submission = sub_res.scalars().first()
        submission_existed = submission is not None

    # --- Quiz scoring (100 ball tizimida) ---
    correct_count = 0
    total_questions = 0
    quiz_details = []

    # Story Fetch for question lookup
    story_obj = None
    if data.story_id:
        s_res = await db.execute(select(OlympiadStory).where(OlympiadStory.id == data.story_id))
        story_obj = s_res.scalars().first()

    logger.info(f"SUBMIT STORY: olympiad={olympiad_id}, story_id={data.story_id}, answers_count={len(data.quiz_answers) if data.quiz_answers else 0}")

    if data.quiz_answers:
        for ans in data.quiz_answers:
            logger.info(f"Checking story question_id: {ans.question_id}")
            question_data = None
            question = None  # ORM object (only set for OlympiadQuestion records)
            is_correct = False
            is_olympiad_q = False
            
            # 1. Handle TestAI questions: testai_{st_id}_{idx}
            if str(ans.question_id).startswith("testai_"):
                parts = str(ans.question_id).split("_")
                if len(parts) >= 3:
                    st_id, q_idx_str = parts[1], parts[2]
                    try:
                        q_idx = int(q_idx_str)
                        # Lookup in SavedTest
                        q_st = await db.execute(select(SavedTest).where(SavedTest.id == st_id))
                        st_obj = q_st.scalars().first()
                        
                        if st_obj and st_obj.questions and 0 <= q_idx < len(st_obj.questions):
                            st_q = st_obj.questions[q_idx]
                            question_data = {
                                "id": ans.question_id,
                                "correct_answer": st_q.get("correct") if st_q.get("correct") is not None else st_q.get("answer_index"),
                                "points": st_q.get("points", 100)
                            }
                    except (ValueError, IndexError):
                        pass
            
            if not question_data:
                # 2. Look for question in global table
                q_res = await db.execute(select(OlympiadQuestion).where(OlympiadQuestion.id == ans.question_id))
                question = q_res.scalars().first()
                if question:
                    question_data = {"id": question.id, "correct_answer": question.correct_answer}
                    is_olympiad_q = True
                elif story_obj and story_obj.questions:
                    # 3. Look for question in story's JSON (might be index or ID)
                    story_qs = story_obj.questions or []
                    for idx, sq in enumerate(story_qs):
                        if ans.question_id == str(sq.get("id", idx)):
                            question_data = {
                                "id": ans.question_id, 
                                "correct_answer": sq.get("answer_index", sq.get("correct_answer"))
                            }
                            break
            
            # Even if we don't find the exact question record but have a score, we proceed
            if not question_data and ans.score is None:
                continue

            total_questions += 1
            if question_data:
                try:
                    is_correct = (int(ans.answer_index) == int(question_data.get("correct_answer")))
                except (ValueError, TypeError):
                    is_correct = False
                
                if is_correct:
                    correct_count += 1
                
                logger.info(f"Story Result: q={ans.question_id}, is_correct={is_correct}, ans={ans.answer_index}, expected={question_data.get('correct_answer')}")

            quiz_details.append({
                "question_id": ans.question_id,
                "submitted_answer": ans.answer_index,
                "is_correct": is_correct,
                "score": ans.score, 
                "points": 100 if is_correct else 0,
            })

            # Save answer only if it's a real OlympiadQuestion AND it's the FIRST attempt
            if is_olympiad_q and question and not submission_existed:
                ans_obj = OlympiadAnswer(
                    participant_id=participant.id,
                    question_id=ans.question_id,
                    selected_answer=ans.answer_index,
                    is_correct=is_correct,
                    points_earned=ans.score if ans.score is not None else (100 if is_correct else 0),
                )
                db.add(ans_obj)


    # Revised Formula (Quiz-Only average or 10 points for reading)
    # components: [Q1_Score, Q2_Score, ...]
    
    item_scores = []
    
    # 1. Quiz components
    if data.quiz_answers:
        for q_detail in quiz_details:
            # If the frontend provided a specific score (AI voice quiz)
            ans_score = None
            for ans in data.quiz_answers:
                if ans.question_id == q_detail["question_id"]:
                    ans_score = ans.score
                    break
            
            if ans_score is not None:
                item_scores.append(float(ans_score))
            else:
                # Fallback for Multiple Choice: 100 for correct, 0 for incorrect
                item_scores.append(100.0 if q_detail["is_correct"] else 0.0)
    
    # 2. Final session score — two different formulas
    if data.story_id:
        # ── ERTAK (Story) ──
        # O'qish uchun 10 ball + savollar o'rtachasi (0-100)
        reading_base = 10
        quiz_avg = sum(item_scores) / len(item_scores) if item_scores else 0
        total_session_points = int(round(reading_base + quiz_avg))
        logger.info(f"STORY SCORE: base={reading_base}, quiz_avg={quiz_avg}, total={total_session_points}")
    else:
        # ── TEST ──
        # Har bir to'g'ri javob = 5 ball
        reading_base = 0
        quiz_avg = 0
        total_session_points = correct_count * 5
        logger.info(f"TEST SCORE: correct={correct_count}, per_correct=5, total={total_session_points}")
    
    # quiz_score for frontend display
    quiz_score = total_session_points

    # --- Reading coins ---
    reading_coins = 0 if data.wpm == 0 else (10 if data.wpm >= 60 else (5 if data.wpm >= 40 else 2))
    
    if data.quiz_answers:
        quiz_coins = correct_count
    else:
        # Use average to decide coins if no answers provided directly
        quiz_coins = 15 if quiz_avg >= 80 else (8 if quiz_avg >= 50 else 3)
        
    total_new_coins = reading_coins + quiz_coins

    # --- Save/Update Submission per Story or General Test ---
    if not submission:
        if data.story_id:
            is_task_res = await db.execute(select(OlympiadReadingTask).where(OlympiadReadingTask.id == data.story_id))
            is_task = is_task_res.scalars().first() is not None
            submission = OlympiadReadingSubmission(
                participant_id=participant.id,
                reading_task_id=data.story_id if is_task else None,
                story_id=data.story_id if not is_task else None,
            )
            db.add(submission)
        else:
            submission = OlympiadReadingSubmission(
                participant_id=participant.id,
                story_id=None,
                reading_task_id=None,
            )
            db.add(submission)

    # Only save/update scores on the submission object if it's the FIRST time
    if not submission_existed:
        submission.words_per_minute = data.wpm
        submission.read_percent = data.read_percent
        submission.reading_duration_seconds = data.reading_time_seconds
        submission.comprehension_score = correct_count
        submission.comprehension_total = total_questions
        submission.comprehension_answers = quiz_details
        submission.total_points = total_session_points
        submission.submitted_at = datetime.now(timezone.utc)
        submission.earned_coins = int(total_new_coins)
    else:
        # Re-take: return FIRST attempt results from DB, don't save anything new.
        # `reading_attempts` is bumped here ONLY — the normal path has its own
        # separate increment so we never double-count.
        logger.info(f"Re-take detected for participant {participant.id}, returning first attempt results.")
        participant.reading_attempts = (participant.reading_attempts or 0) + 1
        await db.commit()
        
        return {
            "success": True,
            "data": {
                "quiz_score": submission.total_points or 0,
                "total_score": participant.total_score or 0,
                "correct_answers": submission.comprehension_score or 0,
                "total_questions": submission.comprehension_total or 0,
                "wpm": submission.words_per_minute or 0,
                "read_percent": submission.read_percent or 0,
                "reading_time_seconds": submission.reading_duration_seconds or 0,
                "reading_coins": 0,
                "quiz_coins": 0,
                "total_coins": 0,
                "attempt": participant.reading_attempts,
                "quiz_details": [],
                "is_retake": True,
            }
        }

    # Ensure current submission is flushed to DB before aggregation
    db.add(participant)
    if submission:
        db.add(submission)
    await db.flush() 

    # --- Aggregation logic ---
    all_subs_res = await db.execute(
        select(OlympiadReadingSubmission).where(
            OlympiadReadingSubmission.participant_id == participant.id
        )
    )
    all_subs = all_subs_res.scalars().all()
    
    if all_subs:
        # 1. Total points (Rating)
        total_points_sum = sum(s.total_points or 0 for s in all_subs)
        
        # 2. Total duration and coins
        total_duration = sum(s.reading_duration_seconds or 0 for s in all_subs)
        total_coins = sum(s.earned_coins or 0 for s in all_subs)
        
        # 3. Averages (WPM and Percent)
        all_count = len(all_subs)
        avg_wpm = sum(s.words_per_minute or 0 for s in all_subs) / all_count
        avg_percent = sum(s.read_percent or 0 for s in all_subs) / all_count
        
        # 4. Quiz-only average for the 'quiz_score' field (0-100 scale ideally)
        total_comp_score = sum(s.comprehension_score or 0 for s in all_subs)
        total_comp_qs = sum(s.comprehension_total or 0 for s in all_subs)
        
        if total_comp_qs > 0:
            avg_comp_score = (total_comp_score / total_comp_qs) * 100 # Overall % correct
        else:
            avg_comp_score = 0
            
        participant.total_score = int(total_points_sum)
        logger.info(f"AGGREGATION: participant={participant.id}, total_score={total_points_sum}, all_subs_count={len(all_subs)}, coins={total_coins}")
        participant.reading_wpm = avg_wpm
        participant.reading_percent = avg_percent
        participant.reading_time_seconds = int(total_duration)
        participant.reading_coins = int(total_coins)
        participant.coins_earned = int(total_coins)
        
        # This reflects the overall quiz performance percentage
        participant.quiz_score = int(round(avg_comp_score))
        
        participant.status = ParticipationStatus.completed
        participant.completed_at = datetime.now(timezone.utc)

    participant.reading_attempts = (participant.reading_attempts or 0) + 1

    # --- Award Coins (Only on first submission of this story/test) ---
    if not submission_existed:
        submission.earned_coins = total_new_coins
        try:
            await _award_coins(
                student_id=participant.student_id,
                amount=total_new_coins,
                tx_type=TransactionType.olympiad_participation,
                description=f"O'qish olimpiadasi: {olympiad.title} (Story: {data.story_id})",
                reference_id=olympiad.id,
                reference_type="reading_olympiad",
                db=db,
            )
        except Exception as e:
            logger.error(f"Coin award error: {e}")

    # Gamification hook only fires when the participation actually just
    # transitioned to `completed` (final submission of a reading olympiad).
    if participant.status == ParticipationStatus.completed and not submission_existed:
        await _run_gamification_post_completion(participant, db)

    await db.commit()

    # Broadcast leaderboard update
    try:
        await manager.broadcast(olympiad.id, {"type": "leaderboard_update"})
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "quiz_score": quiz_score,
            "total_score": participant.total_score,
            "correct_answers": correct_count,
            "total_questions": total_questions,
            "wpm": data.wpm,
            "read_percent": data.read_percent,
            "reading_time_seconds": data.reading_time_seconds,
            "reading_coins": total_new_coins if not submission_existed else 0,
            "quiz_coins": quiz_coins if not submission_existed else 0,
            "total_coins": total_new_coins if not submission_existed else 0,
            "attempt": participant.reading_attempts,
            "quiz_details": quiz_details,
        }
    }


@router.get("/{olympiad_id}/reading-leaderboard")
async def get_reading_leaderboard(
    olympiad_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """
    Reading olympiad leaderboard.
    Only `completed` participants — partial / registered entries would produce
    misleading 0-score rankings. Uses selectinload to eliminate N+1 joins.
    """
    res = await db.execute(select(Olympiad).where(Olympiad.id == olympiad_id))
    olympiad = res.scalars().first()
    if not olympiad:
        raise HTTPException(status_code=404, detail="Olimpiada topilmadi")

    p_res = await db.execute(
        select(OlympiadParticipant)
        .options(selectinload(OlympiadParticipant.student).selectinload(StudentProfile.user))
        .where(
            OlympiadParticipant.olympiad_id == olympiad.id,
            OlympiadParticipant.status == ParticipationStatus.completed,
        )
        .order_by(
            OlympiadParticipant.total_score.desc(),
            OlympiadParticipant.time_spent_seconds.asc(),  # Kamroq vaqt sarflagan
            OlympiadParticipant.completed_at.asc(),  # Teng ballda — kim oldin topshirgan bo'lsa
        )
        .limit(limit)
    )
    participants = p_res.scalars().all()

    leaderboard = []
    for idx, p in enumerate(participants, 1):
        student_name = f"O'quvchi #{idx}"
        try:
            sp = p.student
            if sp and sp.user:
                student_name = f"{sp.user.first_name} {sp.user.last_name}".strip() or student_name
        except Exception:
            pass

        leaderboard.append({
            "rank": idx,
            "student_id": p.student_id,
            "student_name": student_name,
            "total_score": p.total_score or 0,
            "quiz_score": p.quiz_score or 0,
            "reading_wpm": round(p.reading_wpm or 0),
            "reading_percent": round(p.reading_percent or 0),
            "reading_time_seconds": p.reading_time_seconds or 0,
            "time_spent_seconds": p.time_spent_seconds or 0,
            "reading_coins": p.reading_coins or 0,
            "coins_earned": p.coins_earned or 0,
            "reading_attempts": p.reading_attempts or 0,
            "status": p.status.value if p.status else "registered",
        })

    return {
        "success": True,
        "data": {
            "olympiad_title": olympiad.title,
            "leaderboard": leaderboard,
            "total_participants": len(leaderboard),
        }
    }


@router.get("/{olympiad_id}/reading-task")
async def get_reading_task(
    olympiad_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the reading task (text) for a reading olympiad"""
    res = await db.execute(
        select(OlympiadReadingTask).where(OlympiadReadingTask.olympiad_id == olympiad_id)
        .order_by(OlympiadReadingTask.order)
    )
    tasks = res.scalars().all()
    if not tasks:
        return {"success": True, "data": None}

    task = tasks[0]
    return {
        "success": True,
        "data": {
            "id": task.id,
            "title": task.title,
            "text_content": task.text_content,
            "word_count": task.word_count,
            "difficulty": task.difficulty,
            "time_limit_seconds": task.time_limit_seconds,
            "comprehension_questions": task.comprehension_questions,
        }
    }
