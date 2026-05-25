import logging
from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.database.models import User, UserRole, TeacherProfile, StudentProfile, Lesson, Story, StoryReadingRecord
from shared.database.models.classroom import Classroom, ClassroomStudent, ClassroomStudentStatus
from app.middleware.auth import get_current_user
from shared.subscription import require_feature, SubscriptionInfo

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

class StoryCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    content: str
    language: Optional[str] = "uz"
    age_group: Optional[str] = "Barchasi"
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    questions: Optional[List[Dict[str, str]]] = None
    test: Optional[List[Dict[str, Any]]] = None

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    language: Optional[str] = None
    age_group: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    questions: Optional[List[Dict[str, str]]] = None
    test: Optional[List[Dict[str, Any]]] = None

async def get_teacher_profile_local(user: User, db: AsyncSession) -> TeacherProfile:
    if user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar ruxsatga ega")
    res = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == user.id))
    profile = res.scalars().first()
    if not profile:
        profile = TeacherProfile(user_id=user.id)
        db.add(profile)
        await db.flush()
    return profile

def story_dict(s: Story):
    return {
        "id": s.id,
        "teacher_id": s.teacher_id,
        "title": s.title,
        "content": s.content,
        "language": s.language,
        "age_group": s.age_group,
        "has_audio": s.has_audio,
        "audio_url": s.audio_url,
        "image_url": s.image_url,
        "view_count": s.view_count,
        "questions": s.questions or [],
        "test": s.test or [],
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }

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
    sub: SubscriptionInfo = Depends(require_feature("darslar")),
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
    # Studentlar uchun darslar ruxsati tekshiriladi
    sub: SubscriptionInfo = Depends(require_feature("darslar")),
):
    """Get a single lesson by ID (any authenticated user)"""
    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
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


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    sub: SubscriptionInfo = Depends(require_feature("darslar")),
):
    """Mark a lesson as completed to earn XP"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar darsni yakunlay olishi mumkin")

    res = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")

    # Increment total lessons completed
    sp_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    sp = sp_res.scalars().first()
    
    if sp:
        sp.total_lessons_completed += 1
        
        # Gamification: XP & Streak
        from app.services.gamification_service import GamificationService
        xp_result = await GamificationService.add_xp(db, sp.id, 50)
        streak = await GamificationService.update_daily_streak(db, sp.id)
        
        await db.commit()
        return {
            "success": True, 
            "message": "Dars yakunlandi! +50 XP",
            "xp_gained": 50,
            "new_level": xp_result["new_level"] if xp_result else None
        }
    
    return {"success": False, "message": "O'quvchi profili topilmadi"}


@router.get("/lessons")
async def list_all_lessons(
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    sub: SubscriptionInfo = Depends(require_feature("darslar")),
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
    # Get teacher profile
    try:
        teacher = await get_teacher_profile_local(current_user, db)
    except Exception as e:
        logger.error(f"Error getting teacher profile: {str(e)}")
        raise HTTPException(status_code=403, detail=f"O'qituvchi profili topilmadi: {str(e)}")

    # Create lesson object
    try:
        lesson = Lesson(
            id=data.id if hasattr(data, 'id') and data.id else None, # Allow pre-defined ID
            teacher_id=teacher.id,
            title=data.title,
            subject=data.subject,
            grade_level=data.grade_level,
            content=data.content,
            video_url=data.video_url,
            attachments=data.attachments
        )
        
        # Set language safely
        if hasattr(Lesson, 'language') and data.language:
            lesson.language = data.language
            
        db.add(lesson)
        await db.commit()
        await db.refresh(lesson)
        
        return {"success": True, "data": lesson_dict(lesson, current_user.first_name + " " + current_user.last_name)}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating lesson in database: {str(e)}")
        # Check if it's a missing column error
        error_msg = str(e).lower()
        if "column" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="Ma'lumotlar bazasi xatosi: ba'zi ustunlar topilmadi. Iltimos, admin bilan bog'laning (migration 033 talab qilinadi)."
            )
        raise HTTPException(status_code=500, detail=f"Darsni saqlashda xatolik yuz berdi: {str(e)}")

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
    lesson = res.scalars().first()
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
    lesson = res.scalars().first()
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
    lesson = res.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Dars topilmadi")
    
    await db.delete(lesson)
    await db.commit()
    return {"success": True, "message": "Dars o'chirildi"}


# ============================================================================
# TEACHER: Stories (Ertaklar) CRUD
# ============================================================================

@router.post("/teachers/stories")
async def create_teacher_story(
    data: StoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    story = Story(
        teacher_id=teacher.id,
        title=data.title,
        content=data.content,
        language=data.language,
        age_group=data.age_group,
        audio_url=data.audio_url,
        image_url=data.image_url,
        questions=data.questions or [],
        test=data.test or []
    )
    if data.audio_url:
        story.has_audio = True
        
    db.add(story)
    await db.commit()
    await db.refresh(story)
    return {"success": True, "data": story_dict(story)}

@router.get("/teachers/stories")
async def get_my_stories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Story).where(Story.teacher_id == teacher.id).order_by(desc(Story.created_at)))
    stories = res.scalars().all()
    return {"success": True, "data": [story_dict(s) for s in stories]}

@router.get("/teachers/stories/{story_id}")
async def get_teacher_story_detail(
    story_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Story).where(Story.id == story_id, Story.teacher_id == teacher.id))
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    return {"success": True, "data": story_dict(story)}

@router.put("/teachers/stories/{story_id}")
async def update_teacher_story(
    story_id: str, data: StoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Story).where(Story.id == story_id, Story.teacher_id == teacher.id))
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(story, k, v)
        if k == "audio_url":
            story.has_audio = True if v else False
            
    await db.commit()
    await db.refresh(story)
    return {"success": True, "data": story_dict(story)}

@router.delete("/teachers/stories/{story_id}")
async def delete_teacher_story(
    story_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await get_teacher_profile_local(current_user, db)
    res = await db.execute(select(Story).where(Story.id == story_id, Story.teacher_id == teacher.id))
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    
    await db.delete(story)
    await db.commit()
    return {"success": True, "message": "Ertak o'chirildi"}


# ============================================================================
# PUBLIC: Stories (Ertaklar) — for students
# ============================================================================


@router.get("/stories")
async def list_public_stories(
    language: Optional[str] = None,
    age_group: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List global stories for students (Library/Browse)"""
    stmt = select(Story)
    
    # Faqat global/admin ertaklar (o'qituvchilar o'z sinfiga berganlari vazifada chiqadi)
    if current_user.role == UserRole.student:
        stmt = stmt.where(Story.teacher_id == None)
        
    if language:
        stmt = stmt.where(Story.language == language)
    if age_group:
        stmt = stmt.where(Story.age_group == age_group)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    result = await db.execute(stmt.order_by(desc(Story.created_at)).offset(offset).limit(limit))
    stories = result.scalars().all()

    return {
        "success": True,
        "data": [story_dict(s) for s in stories],
        "total": total,
    }
    
    return {
        "success": True,
        "data": story_dict(story)
    }

@router.get("/stories/my-library")
async def get_my_library(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """O'quvchi o'qib bo'lgan kitoblar ro'yxati (Kutubxona)"""
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")

    stmt = (
        select(Story, StoryReadingRecord)
        .join(StoryReadingRecord, StoryReadingRecord.story_id == Story.id)
        .where(StoryReadingRecord.student_user_id == current_user.id)
        .order_by(desc(StoryReadingRecord.completed_at))
    )
    res = await db.execute(stmt)
    results = res.all()
    
    data = []
    for story, record in results:
        s_dict = story_dict(story)
        s_dict['reading_record'] = {
            "wpm": record.wpm,
            "quiz_score": record.quiz_score,
            "test_score": record.test_score,
            "completed_at": record.completed_at.isoformat() if record.completed_at else None
        }
        data.append(s_dict)
        
    return {"success": True, "data": data}

@router.post("/stories/{story_id}/complete")
async def record_story_completion(
    story_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ertakni o'qib bo'linganligini yozib qo'yish (vazifa bo'lmagan holatda).
    Kutubxonada ko'rinishi uchun.
    """
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar uchun")
    
    # Allaqachon o'qilganmi?
    # 2. StoryReadingRecord yaratish yoki yangilash
    existing_res = await db.execute(
        select(StoryReadingRecord).where(
            StoryReadingRecord.student_user_id == current_user.id,
            StoryReadingRecord.story_id == story_id
        )
    )
    record = existing_res.scalars().first()
    
    wpm = data.get("wpm")
    quiz_score = data.get("quiz_score")
    test_score = data.get("test_score")
    
    if record:
        # Mavjud bo'lsa yangilaymiz
        if wpm is not None: record.wpm = int(wpm)
        if quiz_score is not None: record.quiz_score = int(quiz_score)
        if test_score is not None: record.test_score = int(test_score)
        record.completed_at = datetime.now(timezone.utc)
    else:
        # Yangi yaratamiz
        record = StoryReadingRecord(
            student_user_id=current_user.id,
            story_id=story_id,
            wpm=int(wpm) if wpm is not None else 0,
            quiz_score=int(quiz_score) if quiz_score is not None else 0,
            test_score=int(test_score) if test_score is not None else 0
        )
        db.add(record)
        
    await db.commit()
    return {"success": True, "message": "Natija saqlandi"}

@router.get("/stories/{story_id}")
async def get_public_story(
    story_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single story by ID for students"""
    res = await db.execute(select(Story).where(Story.id == story_id))
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")
    
    return {
        "success": True,
        "data": story_dict(story)
    }


# ============================================================================
# TTS: AI ertak o'qish (OpenAI TTS)
# ============================================================================

import os
import httpx
from fastapi import Response as FastAPIResponse

from shared.services.azure_speech_service import speech_service
@router.post("/stories/{story_id}/tts")
async def story_tts(
    story_id: str,
    db: AsyncSession = Depends(get_db),
):
    """AI yordamida ertakni o'qib berish (Azure TTS) — auth kerak emas"""
    res = await db.execute(select(Story).where(Story.id == story_id))
    story = res.scalars().first()
    if not story:
        raise HTTPException(status_code=404, detail="Ertak topilmadi")

    text = (story.content or "")[:4096]
    if not text.strip():
        raise HTTPException(status_code=400, detail="Ertak matni bo'sh")

    lang = story.language or "uz"
    logger.info(f"Azure TTS request: story={story_id}, lang={lang}, text_len={len(text)}")

    try:
        audio_content = await speech_service.text_to_speech(text=text, language=lang, gender="female")
        return FastAPIResponse(content=audio_content, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error for story {story_id}: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"TTS xatoligi: {str(e)}")


