"""
Dashboard Router - MainPlatform
Student and Parent dashboards
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.database.models import User
from app.middleware.auth import get_current_user

router = APIRouter()

@router.get("/student")
async def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get student dashboard data"""
    # TODO: Implement dashboard logic using shared models
    return {
        "success": True,
        "data": {
            "user": current_user.to_dict(),
            "stats": {
                "total_lessons": 0,
                "total_games": 0,
                "total_coins": 0,
                "current_streak": 0
            }
        }
    }

@router.get("/parent")
async def get_parent_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get parent dashboard data"""
    # TODO: Implement dashboard logic
    return {
        "success": True,
        "data": {
            "user": current_user.to_dict(),
            "children": [],
            "stats": {}
        }
    }
