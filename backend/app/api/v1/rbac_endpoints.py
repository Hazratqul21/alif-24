"""
RBAC API Endpoints
Parent, Teacher, and Admin endpoints with role-based access control
"""
from typing import Optional, List
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.middleware.deps import (
    get_current_active_user,
    only_super_admin,
    only_admin_or_super,
    only_teacher,
    only_parent,
    only_parent_of_child,
    only_teacher_owner
)
from app.models import (
    User, UserRole, ChildRelationship, AccountStatus, StudentProfile, TeacherProfile, Classroom
)
from app.services.parent_service import ParentService
from app.services.teacher_service_rbac import TeacherService
from app.services.admin_service import AdminService


# ============================================================
# SCHEMAS
# ============================================================

from app.schemas.rbac import (
    CreateChildRequest, UpdateChildSettingsRequest,
    CreateClassroomRequest, AddStudentRequest, AddStudentByCodeRequest,
    RejectTeacherRequest, UpdateUserStatusRequest, ChildLoginRequest
)


# ============================================================
# PARENT ENDPOINTS
# ============================================================

parent_router = APIRouter(prefix="/parents", tags=["Parents"])


@parent_router.post("/children", status_code=status.HTTP_201_CREATED)
async def create_child(
    request: CreateChildRequest,
    current_user: User = Depends(only_parent),
    db: Session = Depends(get_db)
):
    """
    Create a new child account linked to parent
    
    - Generates unique username and PIN for child login
    - Child can login with username + PIN (no email required)
    """
    service = ParentService(db)
    return service.create_child_account(
        parent_id=current_user.id,
        first_name=request.first_name,
        last_name=request.last_name,
        date_of_birth=request.date_of_birth,
        relationship=request.relationship,
        avatar_id=request.avatar_id
    )


@parent_router.get("/children")
async def get_my_children(
    current_user: User = Depends(only_parent),
    db: Session = Depends(get_db)
):
    """
    Get all children belonging to the parent
    """
    service = ParentService(db)
    return service.get_children(current_user.id)


@parent_router.get("/children/{child_id}")
async def get_child_details(
    child_id: UUID,
    current_user: User = Depends(only_parent),
    db: Session = Depends(get_db)
):
    """
    Get detailed progress for a specific child
    """
    # Verify parent owns this child
    await only_parent_of_child(child_id, current_user, db)
    
    service = ParentService(db)
    return service.get_child_progress(current_user.id, child_id)


@parent_router.patch("/children/{child_id}/settings")
async def update_child_settings(
    child_id: UUID,
    request: UpdateChildSettingsRequest,
    current_user: User = Depends(only_parent),
    db: Session = Depends(get_db)
):
    """
    Update parental control settings for a child
    """
    await only_parent_of_child(child_id, current_user, db)
    
    service = ParentService(db)
    return service.update_child_settings(
        parent_id=current_user.id,
        child_id=child_id,
        screen_time_limit=request.screen_time_limit,
        is_restricted=request.is_restricted
    )


@parent_router.post("/children/{child_id}/regenerate-pin")
async def regenerate_child_pin(
    child_id: UUID,
    current_user: User = Depends(only_parent),
    db: Session = Depends(get_db)
):
    """
    Regenerate PIN code for child account
    """
    await only_parent_of_child(child_id, current_user, db)
    
    service = ParentService(db)
    return service.regenerate_child_pin(current_user.id, child_id)


# ============================================================
# TEACHER ENDPOINTS
# ============================================================

teacher_router = APIRouter(prefix="/teachers", tags=["Teachers"])


@teacher_router.post("/classrooms", status_code=status.HTTP_201_CREATED)
async def create_classroom(
    request: CreateClassroomRequest,
    current_user: User = Depends(only_teacher),
    db: Session = Depends(get_db)
):
    """
    Create a new classroom
    
    - Generates unique join code
    - Teacher must be verified/approved
    """
    service = TeacherService(db)
    return service.create_classroom(
        teacher_user_id=current_user.id,
        name=request.name,
        description=request.description,
        subject=request.subject,
        grade_level=request.grade_level,
        max_students=request.max_students
    )


@teacher_router.get("/my-classes")
async def get_my_classrooms(
    current_user: User = Depends(only_teacher),
    db: Session = Depends(get_db)
):
    """
    Get all classrooms owned by the teacher
    """
    service = TeacherService(db)
    return service.get_my_classrooms(current_user.id)


@teacher_router.get("/classrooms/{classroom_id}/students")
async def get_classroom_students(
    classroom_id: UUID,
    current_user: User = Depends(only_teacher),
    db: Session = Depends(get_db)
):
    """
    Get all students in a classroom
    
    - Teacher must own the classroom
    """
    # Verify ownership
    await only_teacher_owner(classroom_id, current_user, db)
    
    service = TeacherService(db)
    return service.get_classroom_students(current_user.id, classroom_id)


@teacher_router.post("/classrooms/{classroom_id}/students")
async def add_student_to_classroom(
    classroom_id: UUID,
    request: AddStudentRequest,
    current_user: User = Depends(only_teacher),
    db: Session = Depends(get_db)
):
    """
    Add a student to the classroom
    
    - Teacher must own the classroom
    """
    await only_teacher_owner(classroom_id, current_user, db)
    
    service = TeacherService(db)
    return service.add_student_to_class(
        teacher_user_id=current_user.id,
        classroom_id=classroom_id,
        student_user_id=request.student_user_id
    )


@teacher_router.post("/classrooms/join")
async def add_student_by_code(
    request: AddStudentByCodeRequest,
    current_user: User = Depends(only_teacher),
    db: Session = Depends(get_db)
):
    """
    Add student to classroom using join code
    """
    service = TeacherService(db)
    return service.add_student_by_code(
        student_user_id=request.student_user_id,
        join_code=request.join_code
    )


@teacher_router.delete("/classrooms/{classroom_id}/students/{student_id}")
async def remove_student_from_classroom(
    classroom_id: UUID,
    student_id: UUID,
    current_user: User = Depends(only_teacher),
    db: Session = Depends(get_db)
):
    """
    Remove a student from the classroom
    """
    await only_teacher_owner(classroom_id, current_user, db)
    
    service = TeacherService(db)
    return service.remove_student_from_class(
        teacher_user_id=current_user.id,
        classroom_id=classroom_id,
        student_user_id=student_id
    )


# ============================================================
# ADMIN ENDPOINTS
# ============================================================

admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.post("/approve-teacher/{teacher_id}")
async def approve_teacher(
    teacher_id: UUID,
    current_user: User = Depends(only_super_admin),
    db: Session = Depends(get_db)
):
    """
    Approve a pending teacher account
    
    - Only super_admin can access
    """
    service = AdminService(db)
    return service.approve_teacher(current_user.id, teacher_id)


@admin_router.post("/reject-teacher/{teacher_id}")
async def reject_teacher(
    teacher_id: UUID,
    request: RejectTeacherRequest,
    current_user: User = Depends(only_super_admin),
    db: Session = Depends(get_db)
):
    """
    Reject a pending teacher account
    """
    service = AdminService(db)
    return service.reject_teacher(current_user.id, teacher_id, request.reason)


@admin_router.get("/pending-teachers")
async def get_pending_teachers(
    current_user: User = Depends(only_admin_or_super),
    db: Session = Depends(get_db)
):
    """
    Get all pending teacher applications
    """
    service = AdminService(db)
    return service.get_pending_teachers()


@admin_router.get("/stats")
async def get_platform_stats(
    current_user: User = Depends(only_admin_or_super),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide statistics
    """
    service = AdminService(db)
    return service.get_platform_stats()


@admin_router.get("/users")
async def get_all_users(
    role: Optional[UserRole] = None,
    user_status: Optional[AccountStatus] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(only_admin_or_super),
    db: Session = Depends(get_db)
):
    """
    Get all users with optional filters
    """
    service = AdminService(db)
    return service.get_all_users(role, user_status, skip, limit)


@admin_router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: UUID,
    request: UpdateUserStatusRequest,
    current_user: User = Depends(only_super_admin),
    db: Session = Depends(get_db)
):
    """
    Update user account status
    """
    service = AdminService(db)
    return service.update_user_status(user_id, request.status)


# CHILD AUTH ENDPOINT REMOVED (Moved to auth.py)
