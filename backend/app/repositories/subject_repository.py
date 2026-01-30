from app.repositories.base_repository import BaseRepository
from app.models.subject import Subject
from sqlalchemy.orm import Session

class SubjectRepository(BaseRepository[Subject]):
    def __init__(self, db: Session):
        super().__init__(Subject, db)
