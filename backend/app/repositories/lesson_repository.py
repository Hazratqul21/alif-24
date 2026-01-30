from app.repositories.base_repository import BaseRepository
from app.models.lesson import Lesson
from sqlalchemy.orm import Session

class LessonRepository(BaseRepository[Lesson]):
    def __init__(self, db: Session):
        super().__init__(Lesson, db)
