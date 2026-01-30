from app.repositories.base_repository import BaseRepository
from app.repositories.user_repository import UserRepository
from app.repositories.student_repository import StudentRepository
from app.repositories.lesson_repository import LessonRepository
from app.repositories.game_repository import GameRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.avatar_repository import AvatarRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "StudentRepository",
    "LessonRepository",
    "GameRepository",
    "ProfileRepository",
    "AvatarRepository",
]

