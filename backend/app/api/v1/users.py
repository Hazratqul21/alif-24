from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/")
async def get_users(db: Session = Depends(get_db)):
    """Get all users"""
    return {"success": True, "data": []}

