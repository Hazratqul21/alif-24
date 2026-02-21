import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from shared.database import get_db
from shared.database.models import User, UserRole, PlatformContent
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

class ContentUpdate(BaseModel):
    value: Dict[str, Any]

@router.get("/public/content")
async def get_all_content(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PlatformContent))
    contents = res.scalars().all()
    result = {c.key: c.value for c in contents}
    return {"success": True, "data": result}
    
@router.get("/public/content/{key}")
async def get_single_content(key: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    content = res.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Topilmadi")
    return {"success": True, "data": content.value}

@router.put("/admin/content/{key}")
async def update_content(
    key: str, 
    data: ContentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Faqat adminlar ruxsatga ega")
        
    res = await db.execute(select(PlatformContent).where(PlatformContent.key == key))
    content = res.scalar_one_or_none()
    if not content:
        content = PlatformContent(key=key, value=data.value)
        db.add(content)
    else:
        content.value = data.value
        
    await db.commit()
    await db.refresh(content)
    return {"success": True, "data": {"key": content.key, "value": content.value}}
