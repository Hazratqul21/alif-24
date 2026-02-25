from fastapi import APIRouter, Depends, Query, Request, status, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from shared.database import get_db
from shared.database.models import User, TeacherProfile, StudentProfile, AccountStatus
from shared.auth import verify_token
from . import schemas, services

router = APIRouter(tags=["CRM"])
security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user - cookie or Bearer header"""
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    stmt = select(User).filter(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.status != AccountStatus.active:
        raise HTTPException(status_code=403, detail="User account is deactivated")
    
    return user


# --- Leads ---
@router.post("/leads", response_model=schemas.LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_in: schemas.LeadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    return await service.create_lead(lead_in)

@router.get("/leads", response_model=List[schemas.LeadResponse])
async def get_leads(
    status: schemas.LeadStatus = None,
    search: str = None,
    assigned_to_id: str = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    filter_in = schemas.LeadFilter(status=status, search=search, assigned_to_id=assigned_to_id)
    return await service.get_leads(filter_in, skip, limit)

@router.get("/leads/{lead_id}", response_model=schemas.LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    return await service.get_lead(lead_id)

@router.put("/leads/{lead_id}", response_model=schemas.LeadResponse)
async def update_lead(
    lead_id: str,
    lead_in: schemas.LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    return await service.update_lead(lead_id, lead_in)

@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    await service.delete_lead(lead_id)

# --- Activities ---
@router.post("/leads/{lead_id}/activities", response_model=schemas.ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    lead_id: str,
    activity_in: schemas.ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    return await service.create_activity(lead_id, activity_in, current_user.id)

@router.put("/activities/{activity_id}", response_model=schemas.ActivityResponse)
async def update_activity(
    activity_id: str,
    activity_in: schemas.ActivityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    return await service.update_activity(activity_id, activity_in)

@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = services.CRMService(db)
    await service.delete_activity(activity_id)
