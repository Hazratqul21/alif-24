"""
Shared Database Models - Barcha platformalar uchun umumiy modellar

USAGE:
    from shared.database.models import User, StudentProfile, TeacherProfile
    from shared.database.models import UserRole, AccountStatus
    from shared.database.models import StudentCoin, CoinTransaction
"""

# User va Enums
from shared.database.models.user import (
    User,
    UserRole,
    ModeratorRoleType,
    AccountStatus,
    TeacherStatus,
    ChildRelationship,
    Gender,
    Language
)

# Profiles
from shared.database.models.student import StudentProfile
from shared.database.models.parent import ParentProfile
from shared.database.models.teacher import TeacherProfile
from shared.database.models.organization import OrganizationProfile, ModeratorProfile
from shared.database.models.telegram import PhoneVerification, TelegramUser
from shared.database.models.feedback import PlatformFeedback

# Coin System
from shared.database.models.coin import (
    TransactionType,
    WithdrawalStatus,
    PrizeCategory,
    StudentCoin,
    CoinTransaction,
    CoinWithdrawal,
    Prize,
    PrizeRedemption
)

# Live Quiz System
from shared.database.models.live_quiz import (
    LiveQuizStatus,
    ParticipantState,
    LiveQuiz,
    LiveQuizQuestion,
    LiveQuizParticipant,
    LiveQuizAnswer
)

# Olympiad System
from shared.database.models.olympiad import (
    OlympiadType,
    OlympiadStatus,
    OlympiadSubject,
    ParticipationStatus,
    Olympiad,
    OlympiadQuestion,
    OlympiadParticipant,
    OlympiadAnswer,
    OlympiadReadingTask,
    OlympiadReadingSubmission,
)

# Game System
from shared.database.models.game import (
    GameType,
    Game,
    GameSession
)

# Quiz System
from shared.database.models.quiz import (
    QuizQuestion,
    QuizAttempt
)

# Subject System
from shared.database.models.subject import Subject

# Achievement System
from shared.database.models.achievement import (
    AchievementType,
    AchievementCategory,
    Achievement,
    StudentAchievement
)

# Avatar System
from shared.database.models.avatar import Avatar, UserAvatar

# Notification System
from shared.database.models.notification import (
    NotificationType,
    NotificationStatus,
    NotificationLog
)

# Classroom System
from shared.database.models.classroom import (
    Classroom,
    ClassroomStudent,
    ClassroomInvitation,
    ClassroomStudentStatus,
    InvitationStatus,
    InvitationType,
)

# Assignment System
from shared.database.models.assignment import (
    Assignment,
    AssignmentTarget,
    AssignmentSubmission,
    AssignmentType,
    AssignmentTargetType,
    SubmissionStatus,
    AssignmentCreatorRole,
)

# In-App Notification System
from shared.database.models.in_app_notification import (
    InAppNotification,
    InAppNotifType,
)

from shared.database.models.lesson import Lesson
from shared.database.models.story import Story
from shared.database.models.platform_content import PlatformContent

__all__ = [
    # User Models
    "User",
    "UserRole",
    "ModeratorRoleType",
    "AccountStatus",
    "TeacherStatus",
    "ChildRelationship",
    "Gender",
    "Language",
    
    # Profile Models
    "StudentProfile",
    "ParentProfile",
    "TeacherProfile",
    "OrganizationProfile",
    "ModeratorProfile",
    
    # Telegram Models
    "PhoneVerification",
    "TelegramUser",
    
    # Feedback
    "PlatformFeedback",
    
    # Coin Models
    "TransactionType",
    "WithdrawalStatus",
    "PrizeCategory",
    "StudentCoin",
    "CoinTransaction",
    "CoinWithdrawal",
    "Prize",
    "PrizeRedemption",
    
    # Live Quiz Models
    "LiveQuizStatus",
    "ParticipantState",
    "LiveQuiz",
    "LiveQuizQuestion",
    "LiveQuizParticipant",
    "LiveQuizAnswer",
    
    # Olympiad Models
    "OlympiadType",
    "OlympiadStatus",
    "OlympiadSubject",
    "ParticipationStatus",
    "Olympiad",
    "OlympiadQuestion",
    "OlympiadParticipant",
    "OlympiadAnswer",
    "OlympiadReadingTask",
    "OlympiadReadingSubmission",
    
    # Game Models
    "GameType",
    "Game",
    "GameSession",
    
    # Quiz Models
    "QuizQuestion",
    "QuizAttempt",
    
    # Subject Models
    "Subject",
    
    # Achievement Models
    "AchievementType",
    "AchievementCategory",
    "Achievement",
    "StudentAchievement",
    
    # Avatar Models
    "Avatar",
    "UserAvatar",
    
    # Notification Models
    "NotificationType",
    "NotificationStatus",
    "NotificationLog",

    # Classroom Models
    "Classroom",
    "ClassroomStudent",
    "ClassroomInvitation",
    "ClassroomStudentStatus",
    "InvitationStatus",
    "InvitationType",

    # Assignment Models
    "Assignment",
    "AssignmentTarget",
    "AssignmentSubmission",
    "AssignmentType",
    "AssignmentTargetType",
    "SubmissionStatus",
    "AssignmentCreatorRole",

    # In-App Notification Models
    "InAppNotification",
    "InAppNotifType",

    # Lesson Models
    "Lesson",

    # Story Models
    "Story",

    # Platform Content
    "PlatformContent",
]
