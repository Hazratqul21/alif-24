"""
Lessions Platform Backend - Lessons Router
Darsliklar yaratish va boshqarish (PostgreSQL)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from shared.database import get_db
from shared.database.models.story import Story
from app.lessons.models import Lesson, LessonProgress as LessonProgressModel, LessonStatus

logger = logging.getLogger("lessions")

router = APIRouter()


# ============= Pydantic Schemas =============

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    content: str = Field(..., min_length=10)
    grade_level: Optional[str] = None
    language: str = Field(default="uz")
    video_url: Optional[str] = None  # uz, ru, en


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[str] = None
    language: Optional[str] = None
    video_url: Optional[str] = None


class LessonProgressSchema(BaseModel):
    student_id: Optional[str] = None
    progress_percent: int = Field(..., ge=0, le=100)
    time_spent_minutes: int = Field(default=0, ge=0)


class QuizQuestion(BaseModel):
    question: str = Field(..., min_length=3)
    answer: str = Field(..., min_length=1)  # To'g'ri javob


class ErtakCreate(BaseModel):
    """Ertak (Fairy tale / Story) for reading"""
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=20)
    language: str = Field(default="uz")
    age_group: str = Field(default="6-8")  # 4-6, 6-8, 8-10, 10-12
    has_audio: bool = False
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    questions: List[QuizQuestion] = []  # Admin tomonidan qo'shilgan savollar


def _lesson_to_dict(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "title": lesson.title,
        "subject": lesson.subject,
        "content": lesson.content,
        "grade_level": lesson.grade_level,
        "language": getattr(lesson, 'language', 'uz'),
        "video_url": getattr(lesson, 'video_url', None),
        "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
        "updated_at": lesson.updated_at.isoformat() if lesson.updated_at else None,
    }


def _ertak_to_dict(ertak: Story) -> dict:
    return {
        "id": ertak.id,
        "title": ertak.title,
        "content": ertak.content,
        "language": ertak.language,
        "age_group": ertak.age_group,
        "has_audio": ertak.has_audio,
        "audio_url": ertak.audio_url,
        "image_url": getattr(ertak, 'image_url', None),
        "view_count": ertak.view_count,
        "questions": ertak.questions or [],
        "created_at": ertak.created_at.isoformat() if ertak.created_at else None,
    }


# ============= Lessons CRUD =============

@router.post("/lessons")
async def create_lesson(
    data: LessonCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new lesson"""
    lesson = Lesson(
        title=data.title,
        subject=data.subject,
        content=data.content,
        grade_level=data.grade_level,
        language=data.language,
        video_url=data.video_url,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    logger.info(f"Lesson created: {data.title} (ID: {lesson.id})")
    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.get("/lessons")
async def list_lessons(
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all lessons with optional filters"""
    stmt = select(Lesson)

    if subject:
        stmt = stmt.where(Lesson.subject.ilike(subject))
    if grade_level:
        stmt = stmt.where(Lesson.grade_level == grade_level)
    if language:
        stmt = stmt.where(Lesson.language == language)

    result = await db.execute(stmt)
    results = result.scalars().all()
    return {
        "success": True,
        "data": {
            "lessons": [_lesson_to_dict(l) for l in results],
            "total": len(results)
        }
    }


@router.get("/lessons/{lesson_id}")
async def get_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get lesson details"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.put("/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: str,
    data: LessonUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lesson, key, value)

    await db.commit()
    await db.refresh(lesson)
    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.post("/lessons/{lesson_id}/publish")
async def publish_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Publish a lesson (No-op since status is removed from shared model)"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    await db.delete(lesson)
    await db.commit()
    return {"success": True, "message": "Darslik o'chirildi"}


# ============= Student Progress =============

@router.post("/lessons/{lesson_id}/progress")
async def update_progress(
    lesson_id: str,
    data: LessonProgressSchema,
    db: AsyncSession = Depends(get_db)
):
    """Update student progress for a lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    progress = None
    if data.student_id:
        p_res = await db.execute(
            select(LessonProgressModel).where(
                LessonProgressModel.lesson_id == lesson.id,
                LessonProgressModel.student_id == data.student_id
            )
        )
        progress = p_res.scalars().first()

    if progress:
        progress.progress_percent = data.progress_percent
        progress.time_spent_minutes = data.time_spent_minutes
        progress.completed = data.progress_percent >= 100
    else:
        progress = LessonProgressModel(
            lesson_id=lesson.id,
            student_id=data.student_id,
            progress_percent=data.progress_percent,
            time_spent_minutes=data.time_spent_minutes,
            completed=data.progress_percent >= 100,
        )
        db.add(progress)

    if data.progress_percent >= 100:
        lesson.completion_count += 1

    await db.commit()
    await db.refresh(progress)

    return {
        "success": True,
        "data": {
            "lesson_id": progress.lesson_id,
            "student_id": progress.student_id,
            "progress_percent": progress.progress_percent,
            "time_spent_minutes": progress.time_spent_minutes,
            "completed": progress.completed,
        }
    }


@router.get("/lessons/{lesson_id}/progress/{student_id}")
async def get_progress(
    lesson_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get student progress for a lesson"""
    p_res = await db.execute(
        select(LessonProgressModel).where(
            LessonProgressModel.lesson_id == lesson_id,
            LessonProgressModel.student_id == student_id
        )
    )
    progress = p_res.scalars().first()

    if not progress:
        return {
            "success": True,
            "data": {
                "lesson_id": lesson_id,
                "student_id": student_id,
                "progress_percent": 0,
                "time_spent_minutes": 0,
                "completed": False
            }
        }

    return {
        "success": True,
        "data": {
            "lesson_id": progress.lesson_id,
            "student_id": progress.student_id,
            "progress_percent": progress.progress_percent,
            "time_spent_minutes": progress.time_spent_minutes,
            "completed": progress.completed,
        }
    }


# ============= Ertaklar (Stories/Fairy tales) =============

@router.post("/ertaklar")
async def create_ertak(
    data: ErtakCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new ertak (story)"""
    ertak = Story(
        title=data.title,
        content=data.content,
        language=data.language,
        age_group=data.age_group,
        has_audio=data.has_audio,
        audio_url=data.audio_url,
        questions=[q.dict() for q in data.questions] if data.questions else [],
    )
    db.add(ertak)
    await db.commit()
    await db.refresh(ertak)

    logger.info(f"Ertak created: {data.title} (ID: {ertak.id})")
    return {"success": True, "data": _ertak_to_dict(ertak)}


@router.get("/ertaklar")
async def list_ertaklar(
    language: Optional[str] = None,
    age_group: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all ertaklar (stories)"""
    stmt = select(Story)

    if language:
        stmt = stmt.where(Story.language == language)
    if age_group:
        stmt = stmt.where(Story.age_group == age_group)

    result = await db.execute(stmt)
    results = result.scalars().all()
    return {
        "success": True,
        "data": {
            "ertaklar": [_ertak_to_dict(e) for e in results],
            "total": len(results)
        }
    }


@router.get("/ertaklar/{ertak_id}")
async def get_ertak(
    ertak_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get ertak details"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    ertak.view_count += 1
    await db.commit()
    return {"success": True, "data": _ertak_to_dict(ertak)}


@router.delete("/ertaklar/{ertak_id}")
async def delete_ertak(
    ertak_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete an ertak"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    await db.delete(ertak)
    await db.commit()
    return {"success": True, "message": "Ertak o'chirildi"}


# ============= Ertak Savollar (Quiz Questions) =============

class QuestionsUpdate(BaseModel):
    questions: List[QuizQuestion]


@router.put("/ertaklar/{ertak_id}/questions")
async def update_ertak_questions(
    ertak_id: str,
    data: QuestionsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Admin: ertakka savollar qo'shish yoki yangilash"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    ertak.questions = [q.dict() for q in data.questions]
    await db.commit()
    await db.refresh(ertak)
    return {"success": True, "data": _ertak_to_dict(ertak)}


# ============= Quiz Answer Evaluation (STT + Keyword Scoring) =============

from fastapi import UploadFile, File
import difflib

@router.post("/ertaklar/{ertak_id}/quiz/evaluate")
async def evaluate_quiz_answer(
    ertak_id: str,
    question_index: int,
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Bolaning ovozini qabul qilib, STT orqali matnga aylantiradi va
    admin bergan to'g'ri javob bilan 100 ballik shkalada solishtiradi.
    """
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    questions = ertak.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Savol indeksi noto'g'ri")

    correct_answer = questions[question_index].get("answer", "").strip().lower()

    # STT — Bolaning ovozini matnga aylantirish
    try:
        audio_bytes = await audio.read()
        lang = ertak.language or "uz"
        recognized_text = await speech_service.speech_to_text(audio_data=audio_bytes, language=lang)
        recognized_text = recognized_text.strip().lower()
    except Exception as e:
        logger.warning(f"STT failed: {e}")
        recognized_text = ""

    # Keyword + fuzzy matching scoring (0-100)
    score = 0
    if recognized_text and correct_answer:
        # Sequence matching (overall similarity)
        ratio = difflib.SequenceMatcher(None, recognized_text, correct_answer).ratio()
        score = int(ratio * 100)

        # Bonus: har bir to'g'ri kalit so'z uchun qo'shimcha ball
        correct_words = set(correct_answer.split())
        recognized_words = set(recognized_text.split())
        keyword_matches = len(correct_words & recognized_words)
        if correct_words:
            keyword_ratio = keyword_matches / len(correct_words)
            # Keyword va sequence o'rtacha
            score = int((ratio * 0.5 + keyword_ratio * 0.5) * 100)

        score = min(100, max(0, score))

    return {
        "success": True,
        "data": {
            "recognized_text": recognized_text,
            "correct_answer": questions[question_index].get("answer", ""),
            "score": score,
            "passed": score >= 60,
        }
    }


from fastapi import Form

@router.post("/ertaklar/{ertak_id}/quiz/evaluate-text")
async def evaluate_quiz_answer_text(
    ertak_id: str,
    question_index: int,
    recognized_text: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Frontend'dan tayyor matn (STT orqali olingan) qabul qilinib,
    admin bergan to'g'ri javob bilan 100 ballik shkalada solishtiriladi.
    OpenAI semantic baholash qo'llaniladi, xato bo'lsa difflib fallback.
    """
    import httpx, os
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    questions = ertak.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Savol indeksi noto'g'ri")

    correct_answer = questions[question_index].get("answer", "").strip()
    question_text  = questions[question_index].get("question", "").strip()
    recognized_clean = recognized_text.strip()

    # ── 1. AI-based evaluation (semantic similarity) ──────────────────────────
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

    # ── 2. Fallback: keyword + sequence matching ───────────────────────────────
    if score is None:
        score = 0
        r_lower = recognized_clean.lower()
        c_lower = correct_answer.lower()
        if r_lower and c_lower:
            ratio = difflib.SequenceMatcher(None, r_lower, c_lower).ratio()
            correct_words  = set(c_lower.split())
            recognized_words = set(r_lower.split())
            keyword_ratio = len(correct_words & recognized_words) / len(correct_words) if correct_words else 0
            score = int((ratio * 0.5 + keyword_ratio * 0.5) * 100)
            score = min(100, max(0, score))

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


# ============= TTS — Ertakni AI o'qib berish (OpenAI) =============

from fastapi import Response as FastAPIResponse
from pydantic import BaseModel as TTSBaseModel
import httpx
import os
from shared.services.azure_speech_service import speech_service

class TTSRequest(TTSBaseModel):
    text: str
    language: str = "uz"

# OpenAI TTS — HD ovozlar, bolalar uchun
LANGUAGE_VOICES = {
    "uz": "shimmer",   # O'zbek — iliq, tabiiy ayol ovozi
    "ru": "nova",      # Rus — yumshoq, aniq ayol ovozi
    "en": "nova",      # Ingliz — professional ovoz
}

OPENAI_TTS_URL = os.getenv("OPENAI_TTS_URL", "https://api.openai.com/v1/audio/speech")
TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1-hd")   # e.g gpt-4o-mini-tts
TTS_SPEED = 0.95          # sekinroq — bolalar uchun


@router.post("/ertaklar/{ertak_id}/tts")
async def ertak_tts(
    ertak_id: str,
    db: AsyncSession = Depends(get_db),
):
    """AI yordamida ertakni o'qib berish (Azure TTS)"""
    res = await db.execute(select(Story).where(Story.id == ertak_id))
    ertak = res.scalars().first()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    lang = ertak.language or "uz"
    text = (ertak.content or "")[:4096]

    try:
        # Generate Audio using Azure Speech Services
        audio_content = await speech_service.text_to_speech(text=text, language=lang, gender="female")
        return FastAPIResponse(content=audio_content, media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error for story {ertak_id}: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


@router.post("/tts")
async def general_tts(data: TTSRequest):
    """Umumiy TTS endpoint — istalgan matnni o'qib berish (OpenAI HD)"""
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Tizimda ovoz sozlamalari mavjud emas (API kaliti yo'q)")

    lang = data.language or "uz"
    voice = LANGUAGE_VOICES.get(lang, "shimmer")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_TTS_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": TTS_MODEL,
                    "input": data.text[:4096],
                    "voice": voice,
                    "speed": TTS_SPEED,
                    "response_format": "mp3",
                },
            )
            if response.status_code != 200:
                logger.error(f"OpenAI TTS error: {response.status_code}")
                raise HTTPException(status_code=500, detail=f"OpenAI xatoligi: {response.status_code}")
            return FastAPIResponse(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


