from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user import User, UserRole
from app.models.rbac_models import (
    StudentProfile, TeacherProfile, ParentProfile, AccountStatus
)
from app.repositories.user_repository import UserRepository
from app.middleware.auth import create_access_token, create_refresh_token, verify_token
from app.core.errors import ConflictError, UnauthorizedError, NotFoundError, BadRequestError
from app.core.config import settings
from app.core.logging import logger

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
    
    async def register(self, user_data):
        """Register a new user"""
        identifier = user_data.email or user_data.phone
        
        # Check if user already exists
        if user_data.email:
            existing_user = self.user_repo.find_by_email(user_data.email)
            if existing_user:
                raise ConflictError("Email already registered")
        if user_data.phone:
            existing_user = self.user_repo.find_by_phone(user_data.phone)
            if existing_user:
                raise ConflictError("Phone number already registered")
        
        # Validate role
        requested_role = UserRole(user_data.role) if isinstance(user_data.role, str) else user_data.role
            
        # Create user
        user = User(
            email=user_data.email.lower() if user_data.email else None,
            phone=user_data.phone if user_data.phone and user_data.phone.strip() else None,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role=requested_role
        )
        user.set_password(user_data.password)
        
        self.db.add(user)
        self.db.flush()
        
        logger.info(f"New user registered: {user.email or user.phone} with role {user.role.value}")
        
        # Create role-specific profile (temporarily disabled)
        # self._create_role_profile(user)
        
        # Generate tokens
        access_token = create_access_token(
            str(user.id),
            user.email or user.phone,
            user.role.value
        )
        refresh_token = create_refresh_token(str(user.id))
        
        # Save refresh token
        user.refresh_token = refresh_token
        self.db.commit()
        
        # logger.info(f"New user registered: {identifier}")  # Production: o'chirilgan
        
        return {
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    
    def _create_role_profile(self, user: User):
        """Create role-specific profile"""
        if user.role == UserRole.super_admin:
            # Super admin doesn't need additional profile initially
            pass
        elif user.role == UserRole.admin:
            # Admin doesn't need additional profile initially
            pass
        elif user.role == UserRole.student:
            student = StudentProfile(user_id=user.id)
            self.db.add(student)
        elif user.role == UserRole.teacher:
            teacher = TeacherProfile(user_id=user.id)
            self.db.add(teacher)
        elif user.role == UserRole.parent:
            parent = ParentProfile(user_id=user.id)
            self.db.add(parent)
        self.db.flush()
    
    async def login(self, identifier: str, password: str):
        """Login user"""
        # Try to find user by email or phone
        user = self.user_repo.find_by_email(identifier)
        if not user:
            user = self.user_repo.find_by_phone(identifier)
        
        if not user:
            raise UnauthorizedError("Invalid email/phone or password")
        
        # Check user status (rbac_models uses status field)
        if hasattr(user, 'status') and user.status != AccountStatus.active:
            raise UnauthorizedError("Account is deactivated")
        elif hasattr(user, 'is_active') and not user.is_active:
            raise UnauthorizedError("Account is deactivated")
        
        if not user.verify_password(password):
            logger.warning(f"Failed login attempt for {identifier}")
            raise UnauthorizedError("Invalid email/phone or password")
        
        logger.info(f"User logged in: {identifier}")
        
        # Generate tokens
        access_token = create_access_token(
            str(user.id),
            user.email or user.phone,
            user.role.value
        )
        refresh_token = create_refresh_token(str(user.id))
        
        # Save refresh token and update last login
        user.refresh_token = refresh_token
        user.last_login_at = datetime.utcnow()
        self.db.commit()
        
        # logger.info(f"User logged in: {identifier}")  # Production: o'chirilgan
        
        return {
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    
    async def refresh_token(self, refresh_token: str):
        """Refresh access token"""
        payload = verify_token(refresh_token, settings.JWT_REFRESH_SECRET)
        user_id = payload.get("userId")
        
        user = self.user_repo.find_by_id(user_id)
        if not user or user.refresh_token != refresh_token:
            raise UnauthorizedError("Invalid refresh token")
        
        # Generate new tokens
        new_access_token = create_access_token(
            str(user.id),
            user.email,
            user.role.value
        )
        new_refresh_token = create_refresh_token(str(user.id))
        
        # Update refresh token
        user.refresh_token = new_refresh_token
        self.db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token
        }
    
    async def logout(self, user_id: str):
        """Logout user"""
        user = self.user_repo.find_by_id(user_id)
        if user:
            user.refresh_token = None
            self.db.commit()
        # logger.info(f"User logged out: {user_id}")  # Production: o'chirilgan
    
    async def change_password(self, user_id: str, current_password: str, new_password: str):
        """Change password"""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        if not user.verify_password(current_password):
            raise BadRequestError("Current password is incorrect")
        
        user.set_password(new_password)
        self.db.commit()
        
        # logger.info(f"Password changed for user: {user_id}")  # Production: o'chirilgan
    
    async def get_profile(self, user_id: str):
        """Get current user profile"""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        return user.to_dict()

