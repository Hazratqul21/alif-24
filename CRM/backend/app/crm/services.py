from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, or_, desc
from datetime import datetime

from .models import Lead, Activity
from .schemas import LeadCreate, LeadUpdate, LeadFilter, ActivityCreate, ActivityUpdate
from ..core.errors import NotFoundError, ForbiddenError

class CRMService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Lead Operations ---
    async def create_lead(self, lead_in: LeadCreate) -> Lead:
        lead = Lead(
            first_name=lead_in.first_name,
            last_name=lead_in.last_name,
            phone=lead_in.phone,
            source=lead_in.source,
            status=lead_in.status,
            notes=lead_in.notes,
            assigned_to_id=lead_in.assigned_to_id
        )
        self.db.add(lead)
        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def get_leads(self, filter_in: LeadFilter, skip: int = 0, limit: int = 100) -> List[Lead]:
        # FIX: N+1 Problem solved with joinedload(Lead.activities)
        stmt = select(Lead).options(joinedload(Lead.activities))

        if filter_in.status:
            stmt = stmt.filter(Lead.status == filter_in.status)
        
        if filter_in.assigned_to_id:
            stmt = stmt.filter(Lead.assigned_to_id == filter_in.assigned_to_id)

        if filter_in.search:
            search = f"%{filter_in.search}%"
            stmt = stmt.filter(
                or_(
                    Lead.first_name.ilike(search),
                    Lead.last_name.ilike(search),
                    Lead.phone.ilike(search)
                )
            )
        
        stmt = stmt.order_by(desc(Lead.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.unique().scalars().all()

    async def get_lead(self, lead_id: str) -> Lead:
        # FIX: Optimized single lead fetch too
        stmt = select(Lead).options(joinedload(Lead.activities)).filter(Lead.id == lead_id)
        result = await self.db.execute(stmt)
        lead = result.unique().scalar_one_or_none()
        
        if not lead:
            raise NotFoundError("Lead topilmadi")
        return lead

    async def update_lead(self, lead_id: str, lead_in: LeadUpdate) -> Lead:
        lead = await self.get_lead(lead_id)
        
        update_data = lead_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(lead, field, value)

        await self.db.commit()
        await self.db.refresh(lead)
        return lead

    async def delete_lead(self, lead_id: str):
        lead = await self.get_lead(lead_id)
        await self.db.delete(lead)
        await self.db.commit()

    # --- Activity Operations ---
    async def create_activity(self, lead_id: str, activity_in: ActivityCreate, user_id: str) -> Activity:
        # Check if lead exists
        await self.get_lead(lead_id)
        
        activity = Activity(
            lead_id=lead_id,
            type=activity_in.type,
            summary=activity_in.summary,
            description=activity_in.description,
            due_date=activity_in.due_date,
            is_completed=activity_in.is_completed,
            created_by_id=user_id
        )
        self.db.add(activity)
        await self.db.commit()
        await self.db.refresh(activity)
        return activity

    async def update_activity(self, activity_id: str, activity_in: ActivityUpdate) -> Activity:
        stmt = select(Activity).filter(Activity.id == activity_id)
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        
        if not activity:
            raise NotFoundError("Activity topilmadi")

        update_data = activity_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(activity, field, value)

        await self.db.commit()
        await self.db.refresh(activity)
        return activity

    async def delete_activity(self, activity_id: str):
        stmt = select(Activity).filter(Activity.id == activity_id)
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        
        if not activity:
            raise NotFoundError("Activity topilmadi")
        
        await self.db.delete(activity)
        await self.db.commit()
