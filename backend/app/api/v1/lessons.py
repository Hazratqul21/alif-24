from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.services.lesson_service import LessonService
from app.middleware.deps import get_current_active_user
from app.models import User, UserRole

router = APIRouter()

@router.get("/", response_model=dict)
async def get_lessons(
    skip: int = 0,
    limit: int = 100,
    subject_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Get all lessons with optional filtering"""
    service = LessonService(db)
    filters = {}
    if subject_id:
        filters["subject_id"] = subject_id
    
    lessons = service.find_all(filters=filters, limit=limit, offset=skip)
    return {"success": True, "data": lessons}

@router.get("/{lesson_id}", response_model=dict)
async def get_lesson(lesson_id: UUID, db: Session = Depends(get_db)):
    """Get specific lesson by ID"""
    service = LessonService(db)
    lesson = service.find_by_id(str(lesson_id))
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {"success": True, "data": lesson}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lesson(
    lesson_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create new lesson (Admin/Teacher only)"""
    if current_user.role not in [UserRole.admin, UserRole.super_admin, UserRole.teacher]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = LessonService(db)
    lesson = service.create(lesson_data)
    db.commit()
    return {"success": True, "data": lesson}

@router.put("/{lesson_id}")
async def update_lesson(
    lesson_id: UUID,
    lesson_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update lesson (Admin/Teacher only)"""
    if current_user.role not in [UserRole.admin, UserRole.super_admin, UserRole.teacher]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = LessonService(db)
    lesson = service.update(str(lesson_id), lesson_data)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.commit()
    return {"success": True, "data": lesson}

@router.delete("/{lesson_id}")
async def delete_lesson(
    lesson_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete lesson (Admin only)"""
    if current_user.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    service = LessonService(db)
    success = service.delete(str(lesson_id))
    if not success:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.commit()
    return {"success": True, "message": "Lesson deleted"}
