"""
Teacher Service - Business logic for Teacher operations
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.errors import BadRequestError, NotFoundError, ConflictError, ForbiddenError
from app.models import (
    User, UserRole, AccountStatus, 
    TeacherProfile, TeacherStatus,
    StudentProfile, ParentProfile, ChildRelationship,
    Classroom, ClassroomStudent
)


class TeacherService:
    """
    Service for teacher-specific operations
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_classroom(
        self,
        teacher_user_id: UUID,
        name: str,
        description: Optional[str] = None,
        subject: Optional[str] = None,
        grade_level: Optional[str] = None,
        max_students: int = 30
    ) -> dict:
        """
        Create a new classroom for teacher
        """
        # Get teacher profile
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            raise NotFoundError("Teacher profile not found")
        
        if teacher_profile.verification_status != TeacherStatus.approved:
            raise ForbiddenError("Teacher account not verified. Please wait for approval.")
        
        # Generate unique join code
        max_attempts = 10
        join_code = None
        
        for _ in range(max_attempts):
            join_code = Classroom.generate_join_code()
            existing = self.db.query(Classroom).filter(Classroom.join_code == join_code).first()
            if not existing:
                break
        else:
            raise ConflictError("Could not generate unique join code")
        
        # Create classroom
        classroom = Classroom(
            name=name,
            description=description,
            subject=subject,
            grade_level=grade_level,
            teacher_id=teacher_profile.id,
            join_code=join_code,
            max_students=max_students
        )
        
        self.db.add(classroom)
        
        # Update teacher stats
        teacher_profile.total_classrooms += 1
        
        self.db.commit()
        
        return {
            "id": str(classroom.id),
            "name": classroom.name,
            "join_code": join_code,
            "message": f"Sinf yaratildi. Kod: {join_code}"
        }
    
    def get_my_classrooms(self, teacher_user_id: UUID) -> List[dict]:
        """
        Get all classrooms for a teacher
        """
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            raise NotFoundError("Teacher profile not found")
        
        classrooms = self.db.query(Classroom).filter(
            Classroom.teacher_id == teacher_profile.id,
            Classroom.is_active == True
        ).all()
        
        result = []
        for classroom in classrooms:
            student_count = self.db.query(ClassroomStudent).filter(
                ClassroomStudent.classroom_id == classroom.id,
                ClassroomStudent.is_active == True
            ).count()
            
            result.append({
                "id": str(classroom.id),
                "name": classroom.name,
                "description": classroom.description,
                "subject": classroom.subject,
                "grade_level": classroom.grade_level,
                "join_code": classroom.join_code,
                "student_count": student_count,
                "max_students": classroom.max_students,
                "created_at": classroom.created_at.isoformat() if classroom.created_at else None
            })
        
        return result
    
    def add_student_to_class(
        self,
        teacher_user_id: UUID,
        classroom_id: UUID,
        student_user_id: UUID
    ) -> dict:
        """
        Add a student to a classroom (teacher must own the classroom)
        
        Args:
            teacher_user_id: Teacher's user ID
            classroom_id: Classroom ID
            student_user_id: Student's user ID
        """
        # Verify teacher owns the classroom
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            raise NotFoundError("Teacher profile not found")
        
        classroom = self.db.query(Classroom).filter(
            Classroom.id == classroom_id,
            Classroom.teacher_id == teacher_profile.id
        ).first()
        
        if not classroom:
            raise ForbiddenError("Classroom not found or you don't own it")
        
        # Get student profile
        student_profile = self.db.query(StudentProfile).filter(
            StudentProfile.user_id == student_user_id
        ).first()
        
        if not student_profile:
            raise NotFoundError("Student profile not found")
        
        # Check if already enrolled
        existing = self.db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_id == student_profile.id
        ).first()
        
        if existing:
            if existing.is_active:
                raise ConflictError("Student already enrolled in this classroom")
            else:
                # Re-activate enrollment
                existing.is_active = True
                existing.left_at = None
                self.db.commit()
                return {"message": "Student re-enrolled successfully"}
        
        # Check max students
        current_count = self.db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.is_active == True
        ).count()
        
        if current_count >= classroom.max_students:
            raise BadRequestError(f"Classroom is full ({classroom.max_students} students max)")
        
        # Add student to classroom
        enrollment = ClassroomStudent(
            classroom_id=classroom_id,
            student_id=student_profile.id
        )
        
        self.db.add(enrollment)
        
        # Update teacher stats
        teacher_profile.total_students += 1
        
        self.db.commit()
        
        return {
            "message": "Student added to classroom",
            "classroom": classroom.name,
            "student_id": str(student_user_id)
        }
    
    def add_student_by_code(
        self,
        student_user_id: UUID,
        join_code: str
    ) -> dict:
        """
        Add student to classroom using join code
        """
        classroom = self.db.query(Classroom).filter(
            func.upper(Classroom.join_code) == join_code.upper()
        ).first()
        
        if not classroom:
            raise NotFoundError("Invalid join code")
        
        return self.add_student_to_class(teacher_user_id, classroom.id, student_user_id)
    
    def remove_student_from_class(
        self,
        teacher_user_id: UUID,
        classroom_id: UUID,
        student_user_id: UUID
    ) -> dict:
        """
        Remove a student from classroom
        """
        # Verify teacher owns the classroom
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            raise NotFoundError("Teacher profile not found")
        
        classroom = self.db.query(Classroom).filter(
            Classroom.id == classroom_id,
            Classroom.teacher_id == teacher_profile.id
        ).first()
        
        if not classroom:
            raise ForbiddenError("Classroom not found or you don't own it")
        
        # Get student profile
        student_profile = self.db.query(StudentProfile).filter(
            StudentProfile.user_id == student_user_id
        ).first()
        
        if not student_profile:
            raise NotFoundError("Student not found")
        
        # Find enrollment
        enrollment = self.db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.student_id == student_profile.id,
            ClassroomStudent.is_active == True
        ).first()
        
        if not enrollment:
            raise NotFoundError("Student not enrolled in this classroom")
        
        # Soft delete
        enrollment.is_active = False
        enrollment.left_at = datetime.utcnow()
        
        # Update teacher stats
        teacher_profile.total_students -= 1
        if teacher_profile.total_students < 0:
            teacher_profile.total_students = 0
        
        self.db.commit()
        
        return {"message": "Student removed from classroom"}
    
    def get_classroom_students(
        self,
        teacher_user_id: UUID,
        classroom_id: UUID
    ) -> List[dict]:
        """
        Get all students in a classroom
        """
        # Verify teacher owns the classroom
        teacher_profile = self.db.query(TeacherProfile).filter(
            TeacherProfile.user_id == teacher_user_id
        ).first()
        
        if not teacher_profile:
            raise NotFoundError("Teacher profile not found")
        
        classroom = self.db.query(Classroom).filter(
            Classroom.id == classroom_id,
            Classroom.teacher_id == teacher_profile.id
        ).first()
        
        if not classroom:
            raise ForbiddenError("Classroom not found or you don't own it")
        
        # Get enrolled students
        enrollments = self.db.query(ClassroomStudent).filter(
            ClassroomStudent.classroom_id == classroom_id,
            ClassroomStudent.is_active == True
        ).all()
        
        result = []
        for enrollment in enrollments:
            student_profile = enrollment.student
            if student_profile and student_profile.user:
                result.append({
                    "user": student_profile.user.to_dict(),
                    "profile": {
                        "level": student_profile.level,
                        "total_points": student_profile.total_points,
                        "average_score": student_profile.average_score,
                        "total_lessons_completed": student_profile.total_lessons_completed
                    },
                    "enrolled_at": enrollment.joined_at.isoformat() if enrollment.joined_at else None
                })
        
        return result
