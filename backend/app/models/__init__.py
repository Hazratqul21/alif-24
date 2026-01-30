"""
Alif24 Platform - Model Exports

All core models are consolidated in rbac_models.py.
Legacy files are kept as simple aliases for backward compatibility.
"""

# Re-export everything from rbac_models as primary source of truth
from app.models.rbac_models import (
    User,
    UserRole,
    AccountStatus,
    StudentProfile,
    ParentProfile,
    TeacherProfile,
    TeacherStatus,
    ChildRelationship,
    Classroom,
    ClassroomStudent
)

# Re-export other feature-specific models
from app.models.subject import Subject
from app.models.lesson import Lesson
from app.models.game import Game
from app.models.progress import Progress, ProgressStatus
from app.models.game_session import GameSession
from app.models.achievement import Achievement
from app.models.student_achievement import StudentAchievement
from app.models.notification import Notification
from app.models.avatar import Avatar
from app.models.guest_session import GuestSession
from app.models.teacher_lesson import TeacherLesson, TeacherLessonStudent, TeacherLessonType
from app.models.teacher_test import TeacherTest, TestResult, TestType
from app.models.reading_analysis import ReadingAnalysis

# Language is in user.py (which redirects to rbac_models but adds Language enum)
from app.models.user import Language

# Backward compatibility aliases
Student = StudentProfile
Teacher = TeacherProfile
Parent = ParentProfile
Profile = User
TeacherClassroom = Classroom

__all__ = [
    "User",
    "UserRole",
    "AccountStatus",
    "StudentProfile",
    "ParentProfile",
    "TeacherProfile",
    "TeacherStatus",
    "ChildRelationship",
    "Classroom",
    "ClassroomStudent",
    "Language",
    
    # Logic Aliases
    "Student",
    "Teacher",
    "Parent",
    "Profile",
    "TeacherClassroom",
    
    # Feature models
    "Subject",
    "Lesson",
    "Game",
    "Progress",
    "ProgressStatus",
    "GameSession",
    "Achievement",
    "StudentAchievement",
    "Notification",
    "Avatar",
    "GuestSession",
    "TeacherLesson",
    "TeacherLessonStudent",
    "TeacherLessonType",
    "TeacherTest",
    "TestResult",
    "TestType",
    "ReadingAnalysis",
]
