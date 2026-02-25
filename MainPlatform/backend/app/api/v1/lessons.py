import logging
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.database.models import User, UserRole, TeacherProfile, StudentProfile, Lesson
from shared.database.models.classroom import Classroom, ClassroomStudent, ClassroomStudentStatus
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = "uz"
    video_url: Optional[str] = None
    attachments: Optional[Any] = None

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None
    video_url: Optional[str] = None
    attachments: Optional[Any] = None

async def get_teacher_profile_local(user: User, db: AsyncSession) -> TeacherProfile:
    if user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar ruxsatga ega")
    res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == user.id))
    profile = res.scalar_one_or_none()
    if not profile:
        profile = TeacherProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    return profile

def lesson_dict(l: Lesson, teacher_name: str = None) -> dict:
    d = {
        "id": l.id,
        "title": l.title,
        "subject": l.subject,
        "grade_level": l.grade_level,
        "content": l.content,
        "language": getattr(l, 'language', 'uz'),
        "video_url": l.video_url,
        "attachments": l.attachments,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "updated_at": l.updated_at.isoformat() if l.updated_at else None,
    }
    if teacher_name:
        d["teacher_name"] = teacher_name
    return d


# ============================================================================
# STUDENT-FACING: View lessons
# ============================================================================

@router.get("/lessons/for-me")
async def get_lessons_for_student(
    subject: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get lessons for current student — from their classroom teachers and organization"""
    # Get teacher IDs from student's classrooms
    teacher_ids_q = (
        select(Classroom.teacher_id)
        .join(ClassroomStudent, ClassroomStudent.classroom_id == Classroom.id)
        .where(
            ClassroomStudent.student_user_id == current_user.id,
            ClassroomStudent.status == ClassroomStudentStatus.active,
        )
    )

    base = select(Lesson).where(Lesson.teacher_id.in_(teacher_ids_q))

    if subject:
        base = base.where(Lesson.subject == subject)

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(base.order_by(desc(Lesson.created_at)).offset(offset).limit(limit))
    lessons = result.scalars().all()

    return {
        "success": True,
        "data": [lesson_dict(l) for l in lessons],
        "total": total,
    }


@router.get("/lessons/{lesson_id}")
async def get_lesson_by_id(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single lesson by ID (any authenticated user)"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")

    teacher_name = None
    if lesson.teacher_id:
        tp_res = await db.execute(
            select(User.first_name, User.last_name)
            .join(TeacherProfile, TeacherProfile.user_id == User.id)
            .where(TeacherProfile.id == lesson.teacher_id)
        )
        row = tp_res.first()
        if row:
            teacher_name = f"{row[0]} {row[1]}"

    return {"success": True, "data": lesson_dict(lesson, teacher_name)}


@router.get("/lessons")
async def list_all_lessons(
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all lessons (public browse)"""
    base = select(Lesson)

    if subject:
        base = base.where(Lesson.subject == subject)
    if grade_level:
        base = base.where(Lesson.grade_level == grade_level)
    if search:
        base = base.where(Lesson.title.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(base.order_by(desc(Lesson.created_at)).offset(offset).limit(limit))
    lessons = result.scalars().all()

    return {
        "success": True,
        "data": [lesson_dict(l) for l in lessons],
        "total": total,
    }


# ============================================================================
# TEACHER: CRUD
# ============================================================================

@router.post("/teachers/lessons")
async def create_lesson(
    data: LessonCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    lesson = Lesson(
        teacher_id=teacher.id,
        title=data.title,
        subject=data.subject,
        grade_level=data.grade_level,
        content=data.content,
        video_url=data.video_url,
        attachments=data.attachments
    )
    if hasattr(Lesson, 'language') and data.language:
        lesson.language = data.language
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return {"success": True, "data": lesson_dict(lesson)}

@router.get("/teachers/lessons")
async def get_my_lessons(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Lesson).where(Lesson.teacher_id == teacher.id).order_by(desc(Lesson.created_at)))
    lessons = res.scalars().all()
    return {"success": True, "data": [lesson_dict(l) for l in lessons]}

@router.get("/teachers/lessons/{lesson_id}")
async def get_lesson_detail(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id, Lesson.teacher_id == teacher.id))
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    return {"success": True, "data": lesson_dict(lesson)}

@router.put("/teachers/lessons/{lesson_id}")
async def update_lesson(
    lesson_id: str, data: LessonUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id, Lesson.teacher_id == teacher.id))
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(lesson, k, v)
        
    await db.commit()
    await db.refresh(lesson)
    return {"success": True, "data": lesson_dict(lesson)}

@router.delete("/teachers/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id, Lesson.teacher_id == teacher.id))
    lesson = res.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    
    await db.delete(lesson)
    await db.commit()
    return {"success": True, "message": "Dars o'chirildi"}


# ============================================================================
# PUBLIC: Stories (Ertaklar) — for students
# ============================================================================

from shared.database.models.story import Story

@router.get("/public/stories")
async def list_public_stories(
    language: Optional[str] = None,
    age_group: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all stories for students"""
    stmt = select(Story)
    if language:
        stmt = stmt.where(Story.language == language)
    if age_group:
        stmt = stmt.where(Story.age_group == age_group)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    result = await db.execute(stmt.order_by(desc(Story.created_at)).offset(offset).limit(limit))
    stories = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "title": s.title,
                "content": s.content,
                "language": s.language,
                "age_group": s.age_group,
                "has_audio": s.has_audio,
                "audio_url": s.audio_url,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in stories
        ],
        "total": total,
    }


# ============================================================================
# TTS: AI ertak o'qish (OpenAI TTS)
# ============================================================================

import os
import httpx
from fastapi import Response as FastAPIResponse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech"

# HD ovozlar — bolalar uchun iliq, tabiiy ovozlar
STORY_VOICES = {
    "uz": "shimmer",   # O'zbek — iliq, tabiiy ayol ovozi
    "ru": "nova",      # Rus — yumshoq, aniq ayol ovozi
    "en": "nova",      # Ingliz — professional, tiniq ovoz
}

# HD model = yuqori sifat, bolalar uchun sekinroq tezlik
TTS_MODEL = "tts-1-hd"
TTS_SPEED = 0.95  # biroz sekinroq — bolalar uchun aniqroq

@router.post("/public/stories/{story_id}/tts")
async def story_tts(
    story_id: str,
    db: AsyncSession = Depends(get_db),
):
    """AI yordamida ertakni o'qib berish (OpenAI TTS) — auth kerak emas"""
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY is not set!")
        raise HTTPException(status_code=503, detail="Tizimda ovoz sozlamalari mavjud emas (API kaliti yo'q)")

    res = await db.execute(select(Story).where(Story.id == story_id))
    story = res.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    voice = STORY_VOICES.get(story.language or "uz", "alloy")
    text = (story.content or "")[:4096]
    if not text.strip():
        raise HTTPException(status_code=400, detail="Ertak matni bo'sh")

    logger.info(f"TTS request: story={story_id}, lang={story.language}, voice={voice}, text_len={len(text)}")

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
                logger.error(f"OpenAI TTS error: status={response.status_code}, body={response.text[:500]}")
                raise HTTPException(status_code=500, detail=f"OpenAI xatoligi: {response.status_code}")
            return FastAPIResponse(content=response.content, media_type="audio/mpeg")
    except httpx.HTTPStatusError as e:
        logger.error(f"OpenAI TTS HTTP error: {e.response.status_code} - {e.response.text[:300]}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {e.response.status_code}")
    except Exception as e:
        logger.error(f"TTS error for story {story_id}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


