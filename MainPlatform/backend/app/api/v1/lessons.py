import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.database.models import User, UserRole, TeacherProfile, Lesson
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

class LessonCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    attachments: Optional[str] = None

class LessonUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    attachments: Optional[str] = None

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

def lesson_dict(l: Lesson) -> dict:
    return {
        "id": l.id,
        "title": l.title,
        "subject": l.subject,
        "grade_level": l.grade_level,
        "content": l.content,
        "video_url": l.video_url,
        "attachments": l.attachments,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "updated_at": l.updated_at.isoformat() if l.updated_at else None,
    }

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
