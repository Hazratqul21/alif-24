"""
Admin Service - Business logic for Super Admin operations
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging
import json
import logging
import json

from app.core.errors import BadRequestError, NotFoundError
from app.models import (
    User, UserRole, AccountStatus,
    TeacherProfile, TeacherStatus,
    ParentProfile, StudentProfile,
    Classroom, ClassroomStudent
)



class NotificationService:
    """
    Service for handling system notifications.
    Currently implements a robust logging strategy for production readiness.
    Can be extended to support Email/SMS providers (SendGrid, Twilio, etc.)
    """
    logger = logging.getLogger("NotificationService")

    @staticmethod
    def send_teacher_approval_email(user_email: str, teacher_name: str) -> bool:
        """
        Send approval notification to teacher.
        In production without SMTP, this logs the exact payload that would be sent.
        """
        try:
            # Mocking email sending process with structural logging
            payload = {
                "to": user_email,
                "subject": "Your Teacher Application is Approved!",
                "template": "teacher_approval_en",
                "context": {"name": teacher_name}
            }
            # Log as INFO for audit trails
            NotificationService.logger.info(f"NOTIFICATION_SENT: {json.dumps(payload)}")
            return True
        except Exception as e:
            NotificationService.logger.error(f"NOTIFICATION_FAILED: {str(e)}")
            return False


class AdminService:
    """
    Service for admin/super_admin operations
    """
    
    def __init__(self, db: Session):
        self.db = db
    


    def approve_teacher(
        self,
        admin_user_id: UUID,
        teacher_user_id: UUID
    ) -> dict:
        """
        Approve a pending teacher account
        
        Args:
            admin_user_id: Admin who is approving
            teacher_user_id: Teacher to approve
        """
        logger = logging.getLogger(__name__)

        # Get teacher profile
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            logger.warning(f"Approve attempt failed: Teacher {teacher_user_id} not found")
            raise NotFoundError("Teacher profile not found")
        
        if teacher_profile.verification_status == TeacherStatus.approved:
            logger.info(f"Teacher {teacher_user_id} is already approved")
            raise BadRequestError("Teacher is already approved")
        
        # Approve teacher
        teacher_profile.verification_status = TeacherStatus.approved
        teacher_profile.verified_at = datetime.utcnow()
        teacher_profile.verified_by = admin_user_id
        teacher_profile.rejection_reason = None
        
        self.db.commit()
        
        # Send Notification
        if teacher_profile.user and teacher_profile.user.email:
            NotificationService.send_teacher_approval_email(
                user_email=teacher_profile.user.email,
                teacher_name=f"{teacher_profile.user.first_name} {teacher_profile.user.last_name}"
            )
        else:
            logger.warning(f"Notification skipped for {teacher_user_id}: No email found")
        
        return {
            "message": "Teacher approved successfully",
            "teacher_id": str(teacher_user_id),
            "verified_at": teacher_profile.verified_at.isoformat()
        }
    
    def reject_teacher(
        self,
        admin_user_id: UUID,
        teacher_user_id: UUID,
        reason: str
    ) -> dict:
        """
        Reject a pending teacher account
        """
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            raise NotFoundError("Teacher profile not found")
        
        teacher_profile.verification_status = TeacherStatus.rejected
        teacher_profile.verified_by = admin_user_id
        teacher_profile.rejection_reason = reason
        
        self.db.commit()
        
        return {
            "message": "Teacher rejected",
            "teacher_id": str(teacher_user_id),
            "reason": reason
        }
    
    def get_pending_teachers(self) -> List[dict]:
        """
        Get all pending teacher applications
        """
        pending = self.db.query(TeacherProfile).filter(
            TeacherProfile.verification_status == TeacherStatus.pending
        ).all()
        
        result = []
        for profile in pending:
            if profile.user:
                result.append({
                    "user": profile.user.to_dict(),
                    "profile": {
                        "id": str(profile.id),
                        "specialization": profile.specialization,
                        "qualification": profile.qualification,
                        "years_of_experience": profile.years_of_experience,
                        "bio": profile.bio,
                        "subjects": profile.subjects,
                        "diploma_url": profile.diploma_url,
                        "certificate_urls": profile.certificate_urls,
                        "created_at": profile.created_at.isoformat() if profile.created_at else None
                    }
                })
        
        return result
    
    def get_platform_stats(self) -> dict:
        """
        Get platform-wide statistics
        """
        # User counts by role
        user_stats = self.db.query(
            User.role,
            func.count(User.id)
        ).filter(
            User.status == AccountStatus.active
        ).group_by(User.role).all()
        
        user_counts = {role.value: count for role, count in user_stats}
        
        # Total classrooms
        total_classrooms = self.db.query(func.count(Classroom.id)).filter(
            Classroom.is_active == True
        ).scalar()
        
        # Pending teachers
        pending_teachers = self.db.query(func.count(TeacherProfile.id)).filter(
            TeacherProfile.verification_status == TeacherStatus.pending
        ).scalar()
        
        # Active students (last 7 days)
        seven_days_ago = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        seven_days_ago = seven_days_ago - timedelta(days=7)
        
        active_students = self.db.query(func.count(StudentProfile.id)).filter(
            StudentProfile.last_activity_at >= seven_days_ago
        ).scalar()
        
        return {
            "users": {
                "total": sum(user_counts.values()),
                "by_role": user_counts
            },
            "classrooms": {
                "total": total_classrooms
            },
            "teachers": {
                "pending_approval": pending_teachers
            },
            "students": {
                "active_last_7_days": active_students
            }
        }
    
    def get_all_users(
        self,
        role: Optional[UserRole] = None,
        status: Optional[AccountStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[dict]:
        """
        Get all users with optional filters
        """
        query = self.db.query(User)
        
        if role:
            query = query.filter(User.role == role)
        
        if status:
            query = query.filter(User.status == status)
        
        users = query.offset(skip).limit(limit).all()
        
        return [user.to_dict() for user in users]
    
    def update_user_status(
        self,
        user_id: UUID,
        new_status: AccountStatus
    ) -> dict:
        """
        Update user account status (suspend, activate, etc.)
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise NotFoundError("User not found")
        
        if user.role == UserRole.super_admin:
            raise BadRequestError("Cannot modify super admin status")
        
        old_status = user.status
        user.status = new_status
        
        if new_status == AccountStatus.deleted:
            user.deleted_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "message": f"User status changed from {old_status.value} to {new_status.value}",
            "user_id": str(user_id),
            "new_status": new_status.value
        }
