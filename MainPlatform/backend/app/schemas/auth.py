"""
Auth Schemas - MainPlatform
Uses shared database models
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date
from shared.database.models import UserRole
from app.core.errors import BadRequestError

class LoginRequest(BaseModel):
    email: str  # Can be email or phone
    password: str

class RegisterRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.parent
    
    # Step 2 — Qo'shimcha ma'lumotlar (rolga qarab)
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None  # "male" | "female"
    
    # Student uchun
    grade: Optional[str] = None  # "1-sinf" ... "11-sinf"
    school_name: Optional[str] = None
    
    # Teacher uchun
    specialty: Optional[str] = None
    experience_years: Optional[int] = None
    
    # Organization uchun
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None  # "maktab" | "o'quv_markazi" | "boshqa"
    organization_address: Optional[str] = None
    
    def validate(self):
        """Validate registration data"""
        if not self.email and not self.phone:
            raise BadRequestError("Email yoki telefon raqam kiritilishi shart")
        
        if len(self.password) < 6:
            raise BadRequestError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        
        if len(self.first_name.strip()) < 2:
            raise BadRequestError("Ism kamida 2 ta harfdan iborat bo'lishi kerak")
        
        if len(self.last_name.strip()) < 2:
            raise BadRequestError("Familiya kamida 2 ta harfdan iborat bo'lishi kerak")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
