from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from app.services.rating_service import RatingService
from shared.database.models.reading_rating import RatingPeriod
from shared.database.models.user import User

# This will typically have an authentication dependency, e.g., get_current_user
# from app.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/ratings", tags=["Reading Ratings"])

@router.get("/students")
async def get_student_leaderboard(
    period: RatingPeriod = Query(RatingPeriod.all_time, description="Time period for leaderboard"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get the reading rating leaderboard for students."""
    service = RatingService(db)
    leaderboard, total = await service.get_student_leaderboard(period, limit, offset)
    
    return {
        "status": "success",
        "data": leaderboard,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }

@router.get("/teacher/dashboard")
async def get_teacher_dashboard(
    teacher_id: str = Query(..., description="Teacher's user ID"),
    period: RatingPeriod = Query(RatingPeriod.all_time, description="Time period for dashboard"),
    db: AsyncSession = Depends(get_db)
):
    """Get the teacher's dashboard reading statistics."""
    service = RatingService(db)
    stats = await service.get_teacher_dashboard_stats(teacher_id, period)
    
    return {
        "status": "success",
        "data": stats
    }

@router.get("/organization/dashboard")
async def get_organization_dashboard(
    organization_id: str = Query(..., description="Organization's ID"),
    period: RatingPeriod = Query(RatingPeriod.all_time, description="Time period for dashboard"),
    db: AsyncSession = Depends(get_db)
):
    """Get the organization's dashboard reading statistics."""
    service = RatingService(db)
    stats = await service.get_organization_dashboard_stats(organization_id, period)
    
    return {
        "status": "success",
        "data": stats
    }

@router.get("/teacher/classrooms")
async def get_teacher_classrooms_reading_stats(
    teacher_id: str = Query(..., description="Teacher's user ID"),
    period: RatingPeriod = Query(RatingPeriod.all_time, description="Time period for dashboard"),
    db: AsyncSession = Depends(get_db)
):
    """Get the reading stats aggregated for each of the teacher's classrooms."""
    service = RatingService(db)
    stats = await service.get_teacher_classrooms_reading_stats(teacher_id, period)
    
    return {
        "status": "success",
        "data": stats
    }

@router.get("/classrooms/{classroom_id}")
async def get_classroom_leaderboard(
    classroom_id: str,
    period: RatingPeriod = Query(RatingPeriod.all_time, description="Time period for leaderboard"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get the reading leaderboard for a specific classroom."""
    service = RatingService(db)
    leaderboard, total = await service.get_classroom_leaderboard(classroom_id, period, limit, offset)
    
    return {
        "status": "success",
        "data": leaderboard,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }

from app.middleware.auth import get_current_user

@router.get("/student/me/classrooms")
async def get_student_classrooms_rank(
    period: RatingPeriod = Query(RatingPeriod.all_time, description="Time period for dashboard"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the student's rank in each of their classrooms."""
    service = RatingService(db)
    stats = await service.get_student_classrooms_rank(current_user.id, period)
    
    return {
        "status": "success",
        "data": stats
    }
