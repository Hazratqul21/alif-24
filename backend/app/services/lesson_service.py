from app.services.base_service import BaseService
from app.repositories.lesson_repository import LessonRepository
from sqlalchemy.orm import Session

class LessonService(BaseService):
    def __init__(self, db: Session):
        repository = LessonRepository(db)
        super().__init__(repository, db)
        self.lesson_repo = repository
