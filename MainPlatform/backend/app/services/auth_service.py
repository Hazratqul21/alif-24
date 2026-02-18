"""
Auth Service - MainPlatform
Uses shared auth and database modules
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from shared.database.models import (
    User, UserRole, StudentProfile, TeacherProfile,
    ParentProfile, OrganizationProfile, ModeratorProfile,
    AccountStatus, ModeratorRoleType, Gender
)
from shared.auth import create_access_token, create_refresh_token, verify_token, verify_refresh_token
from ..repositories.user_repository import UserRepository
from ..core.errors import ConflictError, UnauthorizedError, NotFoundError, BadRequestError
from ..core.config import settings
from ..core.logging import logger

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
    
    async def register(self, user_data):
        """Register a new user"""
        # Check if user already exists
        if user_data.email:
            existing_user = await self.user_repo.find_by_email(user_data.email)
            if existing_user:
                raise ConflictError("Email already registered")
        if user_data.phone:
            existing_user = await self.user_repo.find_by_phone(user_data.phone)
            if existing_user:
                raise ConflictError("Phone number already registered")
        
        # Validate role
        requested_role = UserRole(user_data.role) if isinstance(user_data.role, str) else user_data.role
        
        # Create user (using shared User model)
        user = User(
            email=user_data.email.lower() if user_data.email else None,
            phone=user_data.phone if user_data.phone and user_data.phone.strip() else None,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=requested_role
        )
        user.set_password(user_data.password)
        
        # Step 2 — Qo'shimcha ma'lumotlar
        if hasattr(user_data, 'date_of_birth') and user_data.date_of_birth:
            user.date_of_birth = user_data.date_of_birth
        if hasattr(user_data, 'gender') and user_data.gender:
            try:
                user.gender = Gender(user_data.gender)
            except (ValueError, KeyError):
                pass
        
        self.db.add(user)
        await self.db.flush()
        
        logger.info(f"New user registered: {user.email or user.phone} with role {user.role.value}")
        
        # Create role-specific profile with Step 2 data
        await self._create_role_profile(user, user_data)
        
        # Generate tokens using shared auth
        access_token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email or user.phone,
                "role": user.role.value
            }
        )
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Save refresh token
        user.refresh_token = refresh_token
        await self.db.commit()

        return {
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    
    async def _create_role_profile(self, user: User, user_data=None):
        """Create role-specific profile with Step 2 data"""
        if user.role == UserRole.moderator:
            mod_profile = ModeratorProfile(
                user_id=user.id,
                role_type=ModeratorRoleType.methodist
            )
            self.db.add(mod_profile)
        elif user.role == UserRole.organization:
            org_name = f"{user.first_name} {user.last_name}"
            if user_data and hasattr(user_data, 'organization_name') and user_data.organization_name:
                org_name = user_data.organization_name
            org_profile = OrganizationProfile(
                user_id=user.id,
                name=org_name
            )
            self.db.add(org_profile)
        elif user.role == UserRole.student:
            student = StudentProfile(user_id=user.id)
            if user_data:
                if hasattr(user_data, 'grade') and user_data.grade:
                    student.grade = user_data.grade
                if hasattr(user_data, 'school_name') and user_data.school_name:
                    student.school_name = user_data.school_name
            self.db.add(student)
        elif user.role == UserRole.teacher:
            teacher = TeacherProfile(user_id=user.id)
            if user_data:
                if hasattr(user_data, 'specialty') and user_data.specialty:
                    teacher.specialty = user_data.specialty
                if hasattr(user_data, 'experience_years') and user_data.experience_years is not None:
                    teacher.experience_years = user_data.experience_years
            self.db.add(teacher)
        elif user.role == UserRole.parent:
            parent = ParentProfile(user_id=user.id)
            self.db.add(parent)
        await self.db.flush()
    
    async def login(self, identifier: str, password: str):
        """Login user"""
        # Try to find user by email or phone
        user = await self.user_repo.find_by_email(identifier)
        if not user:
            user = await self.user_repo.find_by_phone(identifier)
        
        if not user:
            raise UnauthorizedError("Invalid email/phone or password")
        
        # Check user status
        if user.status != AccountStatus.active:
            raise UnauthorizedError("Account is deactivated")
        
        if not user.verify_password(password):
            logger.warning(f"Failed login attempt for {identifier}")
            raise UnauthorizedError("Invalid email/phone or password")
        
        logger.info(f"User logged in: {identifier}")
        
        # Generate tokens using shared auth
        access_token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email or user.phone,
                "role": user.role.value
            }
        )
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Save refresh token and update last login
        user.refresh_token = refresh_token
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()

        return {
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    
    async def refresh_token(self, refresh_token: str):
        """Refresh access token"""
        payload = verify_refresh_token(refresh_token)
        if not payload:
            raise UnauthorizedError("Invalid or expired refresh token")
        
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedError("Invalid refresh token payload")
        
        user = await self.user_repo.find_by_id(user_id)
        if not user or user.refresh_token != refresh_token:
            raise UnauthorizedError("Invalid refresh token")
        
        # Generate new tokens
        new_access_token = create_access_token(
            data={
                "sub": user.id,
                "email": user.email or user.phone,
                "role": user.role.value
            }
        )
        new_refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Update refresh token
        user.refresh_token = new_refresh_token
        await self.db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token
        }
    
    async def logout(self, user_id: str):
        """Logout user"""
        user = await self.user_repo.find_by_id(user_id)
        if user:
            user.refresh_token = None
            await self.db.commit()
    
    async def change_password(self, user_id: str, current_password: str, new_password: str):
        """Change password"""
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        if not user.verify_password(current_password):
            raise BadRequestError("Current password is incorrect")
        
        user.set_password(new_password)
        await self.db.commit()
    
    async def get_profile(self, user_id: str):
        """Get current user profile"""
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        return user.to_dict()

    async def update_profile(self, user_id: str, updates: dict):
        """Update user profile fields"""
        user = await self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Update allowed fields
        allowed_fields = ['first_name', 'last_name', 'phone', 'email']
        for field in allowed_fields:
            if field in updates:
                setattr(user, field, updates[field])
        
        await self.db.commit()
        return user.to_dict()
