from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from app.models import UserRole
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
    
    def validate(self):
        """
        Custom validation - email yoki phone kiritilishi shart.
        Pydantic model_validator o'rniga alohida metod ishlatiladi
        chunki auth.py'da data.validate() chaqirilgan.
        """
        if not self.email and not self.phone:
            raise BadRequestError("Email yoki telefon raqam kiritilishi shart")
        
        # Password validation
        if len(self.password) < 6:
            raise BadRequestError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        
        # First name validation
        if len(self.first_name.strip()) < 2:
            raise BadRequestError("Ism kamida 2 ta harfdan iborat bo'lishi kerak")
        
        # Last name validation  
        if len(self.last_name.strip()) < 2:
            raise BadRequestError("Familiya kamida 2 ta harfdan iborat bo'lishi kerak")

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

