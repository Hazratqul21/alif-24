"""
Feedback Router - Platform baholash
Foydalanuvchilar va mehmonlar platformani baholashi
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from shared.database import get_db
from shared.database.models import PlatformFeedback, User

router = APIRouter(tags=["feedback"])


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    page: Optional[str] = None
    guest_name: Optional[str] = None
    user_id: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    rating: int
    comment: Optional[str]
    page: Optional[str]
    guest_name: Optional[str]
    user_name: Optional[str] = None
    created_at: Optional[str]


@router.post("/feedback")
async def create_feedback(
    data: FeedbackCreate,
    db: AsyncSession = Depends(get_db)
):
    """Yangi feedback qoldirish (mehmon yoki foydalanuvchi)"""
    feedback = PlatformFeedback(
        user_id=data.user_id if data.user_id else None,
        rating=data.rating,
        comment=data.comment,
        page=data.page,
        guest_name=data.guest_name,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    return {
        "success": True,
        "message": "Fikringiz uchun rahmat!",
        "data": {
            "id": feedback.id,
            "rating": feedback.rating,
        }
    }


@router.get("/feedback/stats")
async def get_feedback_stats(
    db: AsyncSession = Depends(get_db)
):
    """O'rtacha rating va statistika"""
    try:
        avg_result = await db.execute(
            select(func.avg(PlatformFeedback.rating))
        )
        avg_rating = avg_result.scalar() or 0

        count_result = await db.execute(
            select(func.count(PlatformFeedback.id))
        )
        total_count = count_result.scalar() or 0

        # Rating taqsimoti
        distribution = {}
        for star in range(1, 6):
            star_count = await db.execute(
                select(func.count(PlatformFeedback.id)).where(PlatformFeedback.rating == star)
            )
            distribution[str(star)] = star_count.scalar() or 0

        # So'nggi 5 ta feedback
        recent_result = await db.execute(
            select(PlatformFeedback)
            .order_by(PlatformFeedback.created_at.desc())
            .limit(5)
        )
        recent = recent_result.scalars().all()

        recent_list = []
        for fb in recent:
            user_name = None
            if fb.user_id:
                user_res = await db.execute(select(User).where(User.id == fb.user_id))
                user = user_res.scalar_one_or_none()
                if user:
                    user_name = f"{user.first_name} {user.last_name}"

            recent_list.append({
                "id": fb.id,
                "rating": fb.rating,
                "comment": fb.comment,
                "user_name": user_name or fb.guest_name or "Mehmon",
                "created_at": fb.created_at.isoformat() if fb.created_at else None,
            })

        return {
            "success": True,
            "data": {
                "average_rating": round(float(avg_rating), 1),
                "total_reviews": total_count,
                "distribution": distribution,
                "recent": recent_list,
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e


@router.get("/feedback")
async def list_feedback(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Barcha feedbacklar ro'yxati"""
    total_res = await db.execute(select(func.count(PlatformFeedback.id)))
    total = total_res.scalar() or 0

    result = await db.execute(
        select(PlatformFeedback)
        .order_by(PlatformFeedback.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    feedbacks = result.scalars().all()

    items = []
    for fb in feedbacks:
        user_name = None
        if fb.user_id:
            user_res = await db.execute(select(User).where(User.id == fb.user_id))
            user = user_res.scalar_one_or_none()
            if user:
                user_name = f"{user.first_name} {user.last_name}"

        items.append({
            "id": fb.id,
            "rating": fb.rating,
            "comment": fb.comment,
            "page": fb.page,
            "user_name": user_name or fb.guest_name or "Mehmon",
            "created_at": fb.created_at.isoformat() if fb.created_at else None,
        })

    return {
        "success": True,
        "data": {
            "total": total,
            "feedbacks": items,
        }
    }
