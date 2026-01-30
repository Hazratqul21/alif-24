from sqlalchemy.orm import Session
from app.repositories.student_repository import StudentRepository
from app.services.base_service import BaseService

class StudentService(BaseService):
    def __init__(self, db: Session):
        repository = StudentRepository(db)
        super().__init__(repository, db)
        self.student_repo = repository

