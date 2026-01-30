from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date
from app.models import ChildRelationship, AccountStatus

class CreateChildRequest(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    date_of_birth: Optional[date] = None
    relationship: ChildRelationship = ChildRelationship.guardian
    avatar_id: Optional[UUID] = None

class UpdateChildSettingsRequest(BaseModel):
    screen_time_limit: Optional[int] = Field(None, ge=10, le=240)
    is_restricted: Optional[bool] = None

class CreateClassroomRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    max_students: int = Field(default=30, ge=1, le=100)

class AddStudentRequest(BaseModel):
    student_user_id: UUID

class AddStudentByCodeRequest(BaseModel):
    join_code: str = Field(..., min_length=6, max_length=8)
    student_user_id: UUID

class RejectTeacherRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)

class UpdateUserStatusRequest(BaseModel):
    status: AccountStatus

class ChildLoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    pin: str = Field(..., min_length=4, max_length=6)
