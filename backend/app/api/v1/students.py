from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter()

@router.get("/")
async def get_students(db: Session = Depends(get_db)):
    """Get all students"""
    return {"success": True, "data": []}

