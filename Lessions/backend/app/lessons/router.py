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
from app.lessons.models import Lesson, LessonProgress as LessonProgressModel, Ertak, LessonStatus

logger = logging.getLogger("lessions")

router = APIRouter()


# ============= Pydantic Schemas =============

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    content: str = Field(..., min_length=10)
    grade_level: Optional[str] = None
    difficulty: str = Field(default="medium")
    duration_minutes: int = Field(default=30, ge=5, le=180)
    language: str = Field(default="uz")  # uz, ru, en


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    grade_level: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = None
    language: Optional[str] = None


class LessonProgressSchema(BaseModel):
    student_id: Optional[str] = None
    progress_percent: int = Field(..., ge=0, le=100)
    time_spent_minutes: int = Field(default=0, ge=0)


class ErtakCreate(BaseModel):
    """Ertak (Fairy tale / Story) for reading"""
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=20)
    language: str = Field(default="uz")
    age_group: str = Field(default="6-8")  # 4-6, 6-8, 8-10, 10-12
    has_audio: bool = False
    audio_url: Optional[str] = None


def _lesson_to_dict(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "title": lesson.title,
        "subject": lesson.subject,
        "description": lesson.description,
        "content": lesson.content,
        "grade_level": lesson.grade_level,
        "difficulty": lesson.difficulty,
        "duration_minutes": lesson.duration_minutes,
        "language": lesson.language,
        "status": lesson.status.value if lesson.status else "draft",
        "view_count": lesson.view_count,
        "completion_count": lesson.completion_count,
        "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
        "updated_at": lesson.updated_at.isoformat() if lesson.updated_at else None,
    }


def _ertak_to_dict(ertak: Ertak) -> dict:
    return {
        "id": ertak.id,
        "title": ertak.title,
        "content": ertak.content,
        "language": ertak.language,
        "age_group": ertak.age_group,
        "has_audio": ertak.has_audio,
        "audio_url": ertak.audio_url,
        "view_count": ertak.view_count,
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
        description=data.description,
        content=data.content,
        grade_level=data.grade_level,
        difficulty=data.difficulty,
        duration_minutes=data.duration_minutes,
        language=data.language,
        status=LessonStatus.draft,
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
    if status:
        stmt = stmt.where(Lesson.status == LessonStatus(status))

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
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    lesson.view_count += 1
    await db.commit()
    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.put("/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: str,
    data: LessonUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalar_one_or_none()
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
    """Publish a lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Darslik topilmadi")

    lesson.status = LessonStatus.published
    await db.commit()
    await db.refresh(lesson)
    return {"success": True, "data": _lesson_to_dict(lesson)}


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a lesson"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalar_one_or_none()
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
    lesson = res.scalar_one_or_none()
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
        progress = p_res.scalar_one_or_none()

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
    progress = p_res.scalar_one_or_none()

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
    ertak = Ertak(
        title=data.title,
        content=data.content,
        language=data.language,
        age_group=data.age_group,
        has_audio=data.has_audio,
        audio_url=data.audio_url,
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
    stmt = select(Ertak)

    if language:
        stmt = stmt.where(Ertak.language == language)
    if age_group:
        stmt = stmt.where(Ertak.age_group == age_group)

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
    res = await db.execute(select(Ertak).where(Ertak.id == ertak_id))
    ertak = res.scalar_one_or_none()
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
    res = await db.execute(select(Ertak).where(Ertak.id == ertak_id))
    ertak = res.scalar_one_or_none()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    await db.delete(ertak)
    await db.commit()
    return {"success": True, "message": "Ertak o'chirildi"}


# ============= TTS — Ertakni AI o'qib berish (OpenAI) =============

from fastapi import Response as FastAPIResponse
from pydantic import BaseModel as TTSBaseModel
import httpx
import os

class TTSRequest(TTSBaseModel):
    text: str
    language: str = "uz"

# OpenAI TTS — HD ovozlar, bolalar uchun
LANGUAGE_VOICES = {
    "uz": "shimmer",   # O'zbek — iliq, tabiiy ayol ovozi
    "ru": "nova",      # Rus — yumshoq, aniq ayol ovozi
    "en": "nova",      # Ingliz — professional ovoz
}

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech"
TTS_MODEL = "tts-1-hd"   # HD sifat
TTS_SPEED = 0.95          # sekinroq — bolalar uchun


@router.post("/ertaklar/{ertak_id}/tts")
async def ertak_tts(
    ertak_id: str,
    db: AsyncSession = Depends(get_db),
):
    """AI yordamida ertakni o'qib berish (OpenAI TTS HD)"""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API kaliti sozlanmagan")

    res = await db.execute(select(Ertak).where(Ertak.id == ertak_id))
    ertak = res.scalar_one_or_none()
    if not ertak:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    lang = ertak.language or "uz"
    voice = LANGUAGE_VOICES.get(lang, "shimmer")
    text = (ertak.content or "")[:4096]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_TTS_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": TTS_MODEL,
                    "input": text,
                    "voice": voice,
                    "speed": TTS_SPEED,
                    "response_format": "mp3",
                },
            )
            if response.status_code != 200:
                logger.error(f"OpenAI TTS error: {response.status_code} - {response.text[:300]}")
                raise HTTPException(status_code=500, detail=f"OpenAI xatoligi: {response.status_code}")
            return FastAPIResponse(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS error for ertak {ertak_id}: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


@router.post("/tts")
async def general_tts(data: TTSRequest):
    """Umumiy TTS endpoint — istalgan matnni o'qib berish (OpenAI HD)"""
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=400, detail="Matn kiritilmadi")
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API kaliti sozlanmagan")

    lang = data.language or "uz"
    voice = LANGUAGE_VOICES.get(lang, "shimmer")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_TTS_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
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


