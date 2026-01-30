"""
Parent Service - Business logic for Parent-Child management
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.errors import BadRequestError, NotFoundError, ConflictError
from app.core.logging import logger
from app.models import (
    User, UserRole, AccountStatus, 
    StudentProfile, ParentProfile, 
    ChildRelationship
)


class ParentService:
    """
    Service for parent-specific operations
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_child_account(
        self,
        parent_id: UUID,
        first_name: str,
        last_name: str,
        date_of_birth: Optional[datetime] = None,
        relationship: ChildRelationship = ChildRelationship.guardian,
        avatar_id: Optional[UUID] = None
    ) -> dict:
        """
        Create a new child account linked to parent
        
        Child login uses: username + PIN (no email/password)
        
        Args:
            parent_id: Parent user ID
            first_name: Child's first name
            last_name: Child's last name
            date_of_birth: Child's birth date
            relationship: Relationship type (mother, father, etc.)
            avatar_id: Optional avatar ID
        
        Returns:
            dict with child user, credentials, and profile
        """
        # 1. Verify parent exists and has parent role
        parent = self.db.query(User).filter(
            User.id == parent_id,
            User.role == UserRole.parent
        ).first()
        
        if not parent:
            raise NotFoundError("Parent not found")
        
        # 2. Check parent's subscription limit
        parent_profile = self.db.query(ParentProfile).filter(
            ParentProfile.user_id == parent_id
        ).first()
        
        if parent_profile:
            current_children_count = self.db.query(User).filter(
                User.parent_id == parent_id
            ).count()
            
            if current_children_count >= parent_profile.max_children_allowed:
                raise BadRequestError(
                    f"Maximum children limit reached ({parent_profile.max_children_allowed}). "
                    "Upgrade your subscription to add more children."
                )
        
        # 3. Generate unique username and PIN
        max_attempts = 10
        username = None
        
        for _ in range(max_attempts):
            username = User.generate_username(first_name)
            existing = self.db.query(User).filter(User.username == username).first()
            if not existing:
                break
        else:
            raise ConflictError("Could not generate unique username. Please try again.")
        
        pin_code = User.generate_pin(4)
        
        # 4. Create child user
        child_user = User(
            first_name=first_name,
            last_name=last_name,
            username=username,
            date_of_birth=date_of_birth,
            role=UserRole.student,
            status=AccountStatus.active,
            parent_id=parent_id,
            language=parent.language
        )
        child_user.set_pin(pin_code)
        
        self.db.add(child_user)
        self.db.flush()  # Get child_user.id
        
        # 5. Create student profile
        student_profile = StudentProfile(
            user_id=child_user.id,
            parent_user_id=parent_id,
            relationship_type=relationship,
            avatar_id=avatar_id,
            screen_time_limit=parent_profile.default_screen_time if parent_profile else 60
        )
        
        self.db.add(student_profile)
        self.db.commit()
        
        logger.info(f"Parent {parent_id} created child account: {username}")
        
        return {
            "user": child_user.to_dict(),
            "credentials": {
                "username": username,
                "pin": pin_code,
                "login_url": "/api/v1/auth/child-login"
            },
            "profile": {
                "id": str(student_profile.id),
                "level": student_profile.level,
                "total_points": student_profile.total_points
            },
            "message": f"Bola akkaunti yaratildi. Login: {username}, PIN: {pin_code}"
        }
    
    def get_children(self, parent_id: UUID) -> List[dict]:
        """
        Get all children belonging to a parent
        """
        children = self.db.query(User).filter(
            User.parent_id == parent_id,
            User.role == UserRole.student
        ).all()
        
        result = []
        for child in children:
            profile = child.student_profile
            result.append({
                "user": child.to_dict(),
                "profile": {
                    "id": str(profile.id) if profile else None,
                    "level": profile.level if profile else 1,
                    "total_points": profile.total_points if profile else 0,
                    "current_streak": profile.current_streak if profile else 0,
                    "total_lessons_completed": profile.total_lessons_completed if profile else 0,
                    "relationship_type": profile.relationship_type.value if profile else None
                } if profile else None
            })
        
        return result
    
    def get_child_progress(self, parent_id: UUID, child_id: UUID) -> dict:
        """
        Get detailed progress for a specific child
        """
        child = self.db.query(User).filter(
            User.id == child_id,
            User.parent_id == parent_id
        ).first()
        
        if not child:
            raise NotFoundError("Child not found or doesn't belong to this parent")
        
        profile = child.student_profile
        
        return {
            "child": child.to_dict(),
            "progress": {
                "level": profile.level if profile else 1,
                "total_points": profile.total_points if profile else 0,
                "total_coins": profile.total_coins if profile else 0,
                "current_streak": profile.current_streak if profile else 0,
                "longest_streak": profile.longest_streak if profile else 0,
                "total_lessons_completed": profile.total_lessons_completed if profile else 0,
                "total_games_played": profile.total_games_played if profile else 0,
                "total_time_spent": profile.total_time_spent if profile else 0,
                "average_score": profile.average_score if profile else 0,
                "last_activity": profile.last_activity_at.isoformat() if profile and profile.last_activity_at else None
            }
        }
    
    def update_child_settings(
        self,
        parent_id: UUID,
        child_id: UUID,
        screen_time_limit: Optional[int] = None,
        is_restricted: Optional[bool] = None
    ) -> dict:
        """
        Update parental control settings for a child
        """
        child = self.db.query(User).filter(
            User.id == child_id,
            User.parent_id == parent_id
        ).first()
        
        if not child:
            raise NotFoundError("Child not found")
        
        profile = child.student_profile
        if not profile:
            raise NotFoundError("Child profile not found")
        
        if screen_time_limit is not None:
            profile.screen_time_limit = screen_time_limit
        
        if is_restricted is not None:
            profile.is_restricted = is_restricted
        
        self.db.commit()
        
        return {
            "message": "Settings updated",
            "screen_time_limit": profile.screen_time_limit,
            "is_restricted": profile.is_restricted
        }
    
    def regenerate_child_pin(self, parent_id: UUID, child_id: UUID) -> dict:
        """
        Regenerate PIN code for child account
        """
        child = self.db.query(User).filter(
            User.id == child_id,
            User.parent_id == parent_id,
            User.role == UserRole.student
        ).first()
        
        if not child:
            raise NotFoundError("Child not found")
        
        new_pin = User.generate_pin(4)
        child.set_pin(new_pin)
        self.db.commit()
        
        return {
            "username": child.username,
            "new_pin": new_pin,
            "message": f"Yangi PIN kod: {new_pin}"
        }
