"""
Reading Competition Student Router — olim.alif24.uz
O'quvchilar uchun haftalik o'qish musobaqasi

Endpoints:
- GET /competitions — Faol musobaqalar ro'yxati
- GET /competitions/{id} — Musobaqa tafsilotlari (kunlik vazifalar)
- POST /competitions/{id}/tasks/{task_id}/start — O'qishni boshlash
- POST /competitions/{id}/tasks/{task_id}/submit — O'qish natijasini yuborish
- POST /competitions/{id}/test/submit — Test javoblarini yuborish
- GET /competitions/{id}/my-results — Mening natijalarim
- GET /competitions/{id}/leaderboard — Umumiy natijalar (4 guruh)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import difflib
import re

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from shared.database import get_db
from shared.database.models import User
from shared.database.models.reading_competition import (
    ReadingCompetition, ReadingTask, CompetitionTest,
    ReadingSession, CompetitionResult,
    CompetitionStatus, TaskDay, SessionStatus, ResultGroup,
)
from shared.auth import verify_token

router = APIRouter()
security = HTTPBearer(auto_error=False)


# ============================================================
# AUTH HELPER
# ============================================================

async def get_current_student(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """JWT tokendan foydalanuvchini olish - cookie yoki Bearer header"""
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token noto'g'ri yoki muddati o'tgan")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token noto'g'ri")

    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    return user


# ============================================================
# SCHEMAS
# ============================================================

class ReadingSubmit(BaseModel):
    stt_transcript: str
    reading_time_seconds: float
    question_answers: Optional[List[int]] = None  # [0, 2, 1, 3] — variant indexlari

class TestSubmit(BaseModel):
    answers: List[int]  # [0, 2, 1, 3, ...] — har bir savol uchun tanlangan variant


# ============================================================
# SCORING HELPERS
# ============================================================

def calculate_text_similarity(original: str, transcript: str) -> dict:
    """Original matn va STT transcript taqqoslash"""
    if not original or not transcript:
        return {"completion_percentage": 0, "words_read": 0, "total_words": 0}

    # Matnlarni so'zlarga ajratish (kichik harflarda)
    orig_words = re.findall(r'\w+', original.lower())
    trans_words = re.findall(r'\w+', transcript.lower())

    total_words = len(orig_words)
    if total_words == 0:
        return {"completion_percentage": 0, "words_read": 0, "total_words": 0}

    # SequenceMatcher bilan taqqoslash
    matcher = difflib.SequenceMatcher(None, orig_words, trans_words)
    ratio = matcher.ratio()

    # O'qilgan so'zlar soni — matching bloklardan
    matched_words = sum(block.size for block in matcher.get_matching_blocks())

    return {
        "completion_percentage": round(ratio * 100, 1),
        "words_read": matched_words,
        "total_words": total_words,
    }


def calculate_scores(
    completion_pct: float,
    words_read: int,
    total_words: int,
    reading_time: float,
    questions_correct: int,
    questions_total: int,
) -> dict:
    """100 ballik tizimda baholash"""

    # 1. Matn to'liqligi (0-100)
    score_completion = min(100, completion_pct * 1.05)

    # 2. So'zlar soni (0-100) — nechta so'z o'qildi
    score_words = min(100, (words_read / max(total_words, 1)) * 100)

    # 3. Vaqt (0-100) — tezroq = yuqoriroq
    # Benchmark: 1 so'z ~0.6 sek (ideal), 1.2 sek (sekin)
    if reading_time > 0 and total_words > 0:
        expected_time = total_words * 0.8  # o'rtacha kutilgan vaqt
        time_ratio = expected_time / reading_time
        score_time = max(0, min(100, time_ratio * 100))
    else:
        score_time = 0

    # 4. Savollar (0-100)
    if questions_total > 0:
        score_questions = (questions_correct / questions_total) * 100
    else:
        score_questions = 0

    # Jami (o'rtacha)
    total = (score_completion + score_words + score_time + score_questions) / 4

    return {
        "score_completion": round(score_completion, 1),
        "score_words": round(score_words, 1),
        "score_time": round(score_time, 1),
        "score_questions": round(score_questions, 1),
        "total_score": round(total, 1),
    }


# ============================================================
# STUDENT ENDPOINTS
# ============================================================

@router.get("/competitions")
async def list_active_competitions(
    db: AsyncSession = Depends(get_db),
    grade_level: Optional[str] = None,
):
    """Faol musobaqalar ro'yxati (login shart emas)"""
    stmt = (
        select(ReadingCompetition)
        .where(ReadingCompetition.status.in_([CompetitionStatus.active, CompetitionStatus.scoring]))
        .order_by(ReadingCompetition.start_date.desc())
    )
    if grade_level:
        stmt = stmt.where(ReadingCompetition.grade_level == grade_level)

    result = await db.execute(stmt)
    competitions = result.scalars().all()

    items = []
    for c in competitions:
        tasks_count = (await db.execute(
            select(func.count(ReadingTask.id)).where(ReadingTask.competition_id == c.id)
        )).scalar() or 0

        items.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "week_number": c.week_number,
            "year": c.year,
            "grade_level": c.grade_level,
            "language": c.language,
            "status": c.status.value,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "tasks_count": tasks_count,
        })

    return {"success": True, "competitions": items}


@router.get("/competitions/{comp_id}")
async def get_competition_detail(
    comp_id: str,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """Musobaqa tafsilotlari — kunlik vazifalar va o'quvchining progressi"""
    comp_res = await db.execute(
        select(ReadingCompetition).where(ReadingCompetition.id == comp_id)
    )
    comp = comp_res.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Musobaqa topilmadi")

    # Tasks
    tasks_res = await db.execute(
        select(ReadingTask)
        .where(ReadingTask.competition_id == comp_id)
        .order_by(ReadingTask.order_index)
    )
    tasks = tasks_res.scalars().all()

    # Student sessions
    sessions_res = await db.execute(
        select(ReadingSession).where(
            ReadingSession.competition_id == comp_id,
            ReadingSession.student_id == student.id,
        )
    )
    sessions = {s.task_id: s for s in sessions_res.scalars().all()}

    # Test mavjudligi
    test_res = await db.execute(
        select(CompetitionTest).where(CompetitionTest.competition_id == comp_id)
    )
    test = test_res.scalar_one_or_none()

    task_items = []
    for t in tasks:
        session = sessions.get(t.id)
        task_items.append({
            "id": t.id,
            "day_of_week": t.day_of_week.value,
            "title": t.title,
            "image_url": t.image_url,
            "total_words": t.total_words,
            "questions_count": len(t.questions) if t.questions else 0,
            "time_limit_seconds": t.time_limit_seconds,
            # Student progress
            "status": session.status.value if session else "not_started",
            "my_score": session.total_score if session else None,
            "completed": session.status == SessionStatus.completed if session else False,
        })

    return {
        "success": True,
        "competition": {
            "id": comp.id,
            "title": comp.title,
            "description": comp.description,
            "week_number": comp.week_number,
            "year": comp.year,
            "status": comp.status.value,
            "start_date": comp.start_date.isoformat() if comp.start_date else None,
            "end_date": comp.end_date.isoformat() if comp.end_date else None,
        },
        "tasks": task_items,
        "has_test": test is not None,
        "test_time_limit": test.time_limit_minutes if test else None,
    }


@router.get("/competitions/{comp_id}/tasks/{task_id}")
async def get_task_for_reading(
    comp_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """Hikoya matnini olish — o'qish uchun"""
    task_res = await db.execute(
        select(ReadingTask).where(
            ReadingTask.id == task_id,
            ReadingTask.competition_id == comp_id,
        )
    )
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Hikoya topilmadi")

    # Session mavjudligini tekshirish
    session_res = await db.execute(
        select(ReadingSession).where(
            ReadingSession.student_id == student.id,
            ReadingSession.task_id == task_id,
        )
    )
    session = session_res.scalar_one_or_none()

    return {
        "success": True,
        "task": {
            "id": task.id,
            "title": task.title,
            "image_url": task.image_url,
            "story_text": task.story_text,
            "total_words": task.total_words,
            "questions": task.questions,
            "time_limit_seconds": task.time_limit_seconds,
        },
        "session": {
            "status": session.status.value if session else "not_started",
            "total_score": session.total_score if session else None,
        } if session else None,
    }


@router.post("/competitions/{comp_id}/tasks/{task_id}/start")
async def start_reading(
    comp_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """O'qishni boshlash — session yaratish"""
    # Task mavjudligini tekshirish
    task_res = await db.execute(
        select(ReadingTask).where(ReadingTask.id == task_id, ReadingTask.competition_id == comp_id)
    )
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Hikoya topilmadi")

    # Allaqachon session bormi
    existing = await db.execute(
        select(ReadingSession).where(
            ReadingSession.student_id == student.id,
            ReadingSession.task_id == task_id,
        )
    )
    session = existing.scalar_one_or_none()

    if session and session.status == SessionStatus.completed:
        raise HTTPException(status_code=400, detail="Bu hikoyani allaqachon o'qib bo'lgansiz")

    if not session:
        session = ReadingSession(
            student_id=student.id,
            task_id=task_id,
            competition_id=comp_id,
            status=SessionStatus.reading,
            started_at=datetime.now(timezone.utc),
            total_words=task.total_words,
            questions_total=len(task.questions) if task.questions else 0,
        )
        db.add(session)
    else:
        session.status = SessionStatus.reading
        session.started_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(session)

    return {
        "success": True,
        "message": "O'qish boshlandi",
        "session_id": session.id,
        "started_at": session.started_at.isoformat(),
    }


@router.post("/competitions/{comp_id}/tasks/{task_id}/submit")
async def submit_reading(
    comp_id: str,
    task_id: str,
    data: ReadingSubmit,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """O'qish natijasini yuborish — STT transcript + savollar javoblari"""
    # Session
    session_res = await db.execute(
        select(ReadingSession).where(
            ReadingSession.student_id == student.id,
            ReadingSession.task_id == task_id,
        )
    )
    session = session_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=400, detail="Avval o'qishni boshlang")
    if session.status == SessionStatus.completed:
        raise HTTPException(status_code=400, detail="Bu hikoya allaqachon topshirilgan")

    # Task
    task_res = await db.execute(select(ReadingTask).where(ReadingTask.id == task_id))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Hikoya topilmadi")

    # Matn taqqoslash
    similarity = calculate_text_similarity(task.story_text, data.stt_transcript)

    # Savollar tekshirish
    questions_correct = 0
    questions_total = len(task.questions) if task.questions else 0
    if data.question_answers and task.questions:
        for i, answer_idx in enumerate(data.question_answers):
            if i < len(task.questions):
                if answer_idx == task.questions[i].get("correct"):
                    questions_correct += 1

    # Ballarni hisoblash
    scores = calculate_scores(
        completion_pct=similarity["completion_percentage"],
        words_read=similarity["words_read"],
        total_words=similarity["total_words"],
        reading_time=data.reading_time_seconds,
        questions_correct=questions_correct,
        questions_total=questions_total,
    )

    # Session yangilash
    session.status = SessionStatus.completed
    session.completed_at = datetime.now(timezone.utc)
    session.stt_transcript = data.stt_transcript
    session.reading_time_seconds = data.reading_time_seconds
    session.words_read = similarity["words_read"]
    session.total_words = similarity["total_words"]
    session.completion_percentage = similarity["completion_percentage"]
    session.question_answers = data.question_answers
    session.questions_correct = questions_correct
    session.questions_total = questions_total
    session.score_completion = scores["score_completion"]
    session.score_words = scores["score_words"]
    session.score_time = scores["score_time"]
    session.score_questions = scores["score_questions"]
    session.total_score = scores["total_score"]

    await db.commit()

    return {
        "success": True,
        "message": "Natija saqlandi!",
        "result": {
            "completion_percentage": similarity["completion_percentage"],
            "words_read": similarity["words_read"],
            "total_words": similarity["total_words"],
            "reading_time_seconds": data.reading_time_seconds,
            "questions_correct": questions_correct,
            "questions_total": questions_total,
            **scores,
        }
    }


@router.post("/competitions/{comp_id}/test/submit")
async def submit_test(
    comp_id: str,
    data: TestSubmit,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """Shanba testi javoblarini yuborish"""
    # Test
    test_res = await db.execute(
        select(CompetitionTest).where(CompetitionTest.competition_id == comp_id)
    )
    test = test_res.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test topilmadi")

    # Natija hisoblash
    correct = 0
    total = len(test.questions) if test.questions else 0
    for i, answer_idx in enumerate(data.answers):
        if i < total and answer_idx == test.questions[i].get("correct"):
            correct += 1

    test_score = (correct / max(total, 1)) * 100

    # CompetitionResult yaratish yoki yangilash
    result_res = await db.execute(
        select(CompetitionResult).where(
            CompetitionResult.student_id == student.id,
            CompetitionResult.competition_id == comp_id,
        )
    )
    comp_result = result_res.scalar_one_or_none()

    # Daily scores yig'ish
    sessions_res = await db.execute(
        select(ReadingSession).where(
            ReadingSession.student_id == student.id,
            ReadingSession.competition_id == comp_id,
            ReadingSession.status == SessionStatus.completed,
        )
    )
    sessions = sessions_res.scalars().all()
    daily_scores = {}
    total_reading = 0
    for s in sessions:
        task_res = await db.execute(select(ReadingTask).where(ReadingTask.id == s.task_id))
        task = task_res.scalar_one_or_none()
        if task:
            day = task.day_of_week.value
            daily_scores[day] = {
                "score_completion": s.score_completion,
                "score_words": s.score_words,
                "score_time": s.score_time,
                "score_questions": s.score_questions,
                "total_score": s.total_score,
            }
            total_reading += s.total_score

    avg_reading = total_reading / max(len(sessions), 1)

    if not comp_result:
        comp_result = CompetitionResult(
            student_id=student.id,
            competition_id=comp_id,
        )
        db.add(comp_result)

    comp_result.daily_scores = daily_scores
    comp_result.test_score = round(test_score, 1)
    comp_result.test_answers = data.answers
    comp_result.test_correct = correct
    comp_result.test_total = total
    comp_result.total_reading_score = round(avg_reading, 1)
    comp_result.total_score = round((avg_reading * 0.6) + (test_score * 0.4), 1)  # 60% o'qish, 40% test

    await db.commit()

    return {
        "success": True,
        "message": "Test natijasi saqlandi!",
        "result": {
            "test_correct": correct,
            "test_total": total,
            "test_score": round(test_score, 1),
            "total_reading_score": round(avg_reading, 1),
            "total_score": comp_result.total_score,
        }
    }


@router.get("/competitions/{comp_id}/my-results")
async def get_my_results(
    comp_id: str,
    db: AsyncSession = Depends(get_db),
    student: User = Depends(get_current_student),
):
    """Mening natijalarim — kunlik va umumiy"""
    # Sessions
    sessions_res = await db.execute(
        select(ReadingSession, ReadingTask)
        .join(ReadingTask, ReadingSession.task_id == ReadingTask.id)
        .where(
            ReadingSession.student_id == student.id,
            ReadingSession.competition_id == comp_id,
        )
        .order_by(ReadingTask.order_index)
    )
    rows = sessions_res.all()

    daily = []
    for s, t in rows:
        daily.append({
            "day": t.day_of_week.value,
            "title": t.title,
            "status": s.status.value,
            "completion_percentage": s.completion_percentage,
            "words_read": s.words_read,
            "total_words": s.total_words,
            "reading_time_seconds": s.reading_time_seconds,
            "questions_correct": s.questions_correct,
            "questions_total": s.questions_total,
            "score_completion": s.score_completion,
            "score_words": s.score_words,
            "score_time": s.score_time,
            "score_questions": s.score_questions,
            "total_score": s.total_score,
        })

    # Overall result
    result_res = await db.execute(
        select(CompetitionResult).where(
            CompetitionResult.student_id == student.id,
            CompetitionResult.competition_id == comp_id,
        )
    )
    overall = result_res.scalar_one_or_none()

    return {
        "success": True,
        "daily": daily,
        "overall": {
            "total_reading_score": overall.total_reading_score if overall else 0,
            "test_score": overall.test_score if overall else 0,
            "test_correct": overall.test_correct if overall else 0,
            "test_total": overall.test_total if overall else 0,
            "total_score": overall.total_score if overall else 0,
            "rank_overall": overall.rank_overall if overall else None,
            "group": overall.group.value if overall and overall.group else None,
        } if overall else None,
    }


@router.get("/competitions/{comp_id}/leaderboard")
async def get_leaderboard(
    comp_id: str,
    group: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Leaderboard — 4 guruh bo'yicha (login shart emas)
    
    Guruhlar:
    1. fast_reader — matnni 90+% to'liq va TEZ o'qiydiganlar (eng tez → sekin)
    2. accurate_reader — matnni 90+% to'liq o'qib, savollarga TO'LIQ to'g'ri javob berganlar (to'liqlik bo'yicha)
    3. test_master — shanba testini eng yaxshi ishlaganlar (test bali bo'yicha)
    4. champion (default) — hammasidan eng ko'p umumiy bal olganlar
    """
    base_stmt = (
        select(CompetitionResult, User)
        .join(User, CompetitionResult.student_id == User.id)
        .where(CompetitionResult.competition_id == comp_id)
    )

    if group == "fast_reader":
        # 90%+ o'qigan, eng tez o'qigan tartibda
        # total_reading_score da speed ham hisobga olingan, lekin aniqroq qilish uchun
        # reading sessionlardan avg score_time ni ishlatamiz
        stmt = (
            base_stmt
            .where(CompetitionResult.total_reading_score >= 75)  # reading score 75+ (90% completion * scoring = ~75+)
            .order_by(CompetitionResult.total_reading_score.desc())
        )
    elif group == "accurate_reader":
        # 90%+ o'qigan + savollarga to'g'ri javob berganlar
        stmt = (
            base_stmt
            .where(CompetitionResult.total_reading_score >= 75)
            .order_by(CompetitionResult.total_reading_score.desc())
        )
    elif group == "test_master":
        # Test natijasi bo'yicha saralash
        stmt = (
            base_stmt
            .where(CompetitionResult.test_score > 0)
            .order_by(CompetitionResult.test_score.desc(), CompetitionResult.total_score.desc())
        )
    else:
        # Umumiy eng ko'p bal
        stmt = base_stmt.order_by(CompetitionResult.total_score.desc())

    result = await db.execute(stmt.limit(limit))
    rows = result.all()

    # Guruhga qarab qo'shimcha ma'lumot va aniq saralash
    items = []
    if group == "fast_reader":
        # Sessionlardan tezlik ma'lumotini olish
        for i, (cr, user) in enumerate(rows, 1):
            # O'rtacha reading time ni hisoblash
            sessions_res = await db.execute(
                select(ReadingSession).where(
                    ReadingSession.student_id == cr.student_id,
                    ReadingSession.competition_id == comp_id,
                    ReadingSession.status == SessionStatus.completed,
                    ReadingSession.completion_percentage >= 90,
                )
            )
            sessions = sessions_res.scalars().all()
            avg_time = sum(s.reading_time_seconds or 0 for s in sessions) / max(len(sessions), 1)
            avg_completion = sum(s.completion_percentage or 0 for s in sessions) / max(len(sessions), 1)
            total_words = sum(s.words_read or 0 for s in sessions)

            items.append({
                "rank": i,
                "student_name": f"{user.first_name} {user.last_name}",
                "avg_completion": round(avg_completion, 1),
                "avg_reading_time": round(avg_time, 1),
                "total_words_read": total_words,
                "total_reading_score": cr.total_reading_score,
                "total_score": cr.total_score,
                "group": "fast_reader",
            })
        # Eng tez o'qiganlari birinchi
        items.sort(key=lambda x: x["avg_reading_time"] if x["avg_reading_time"] > 0 else 9999)
        for i, item in enumerate(items, 1):
            item["rank"] = i

    elif group == "accurate_reader":
        for i, (cr, user) in enumerate(rows, 1):
            sessions_res = await db.execute(
                select(ReadingSession).where(
                    ReadingSession.student_id == cr.student_id,
                    ReadingSession.competition_id == comp_id,
                    ReadingSession.status == SessionStatus.completed,
                )
            )
            sessions = sessions_res.scalars().all()
            avg_completion = sum(s.completion_percentage or 0 for s in sessions) / max(len(sessions), 1)
            total_correct = sum(s.questions_correct or 0 for s in sessions)
            total_questions = sum(s.questions_total or 0 for s in sessions)

            items.append({
                "rank": i,
                "student_name": f"{user.first_name} {user.last_name}",
                "avg_completion": round(avg_completion, 1),
                "questions_correct": total_correct,
                "questions_total": total_questions,
                "total_reading_score": cr.total_reading_score,
                "total_score": cr.total_score,
                "group": "accurate_reader",
            })
        # Savollarga to'g'ri javob berganlari + to'liq o'qiganlari birinchi
        items.sort(key=lambda x: (-x["questions_correct"], -x["avg_completion"]))
        for i, item in enumerate(items, 1):
            item["rank"] = i

    else:
        for i, (cr, user) in enumerate(rows, 1):
            items.append({
                "rank": i,
                "student_name": f"{user.first_name} {user.last_name}",
                "total_reading_score": cr.total_reading_score,
                "test_score": cr.test_score,
                "total_score": cr.total_score,
                "group": cr.group.value if cr.group else group or "champion",
            })

    return {"success": True, "leaderboard": items, "total": len(items)}
