from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.avatar_service import AvatarService

router = APIRouter()

@router.get("/")
async def get_avatars(db: Session = Depends(get_db)):
    """Get all avatars"""
    service = AvatarService(db)
    avatars = service.avatar_repo.find_all()
    return {
        "success": True,
        "data": [{"id": str(a.id), "key": a.key, "display_name": a.display_name, "image_url": a.image_url} for a in avatars]
    }

