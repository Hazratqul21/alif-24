from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    TRIAL_LESSON = "trial_lesson"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"

class ActivityType(str, Enum):
    CALL = "call"
    MEETING = "meeting"
    NOTE = "note"
    TASK = "task"

# Activity Schemas
class ActivityBase(BaseModel):
    type: ActivityType
    summary: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    type: Optional[ActivityType] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None

class ActivityResponse(ActivityBase):
    id: str
    lead_id: str
    created_at: datetime
    created_by_id: Optional[str] = None

    class Config:
        from_attributes = True

# Lead Schemas
class LeadBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    phone: str
    source: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    notes: Optional[str] = None
    assigned_to_id: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[str] = None

class LeadResponse(LeadBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    activities: List[ActivityResponse] = []

    class Config:
        from_attributes = True

class LeadFilter(BaseModel):
    status: Optional[LeadStatus] = None
    search: Optional[str] = None
    assigned_to_id: Optional[str] = None
