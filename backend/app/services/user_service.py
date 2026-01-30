from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.services.base_service import BaseService

class UserService(BaseService):
    def __init__(self, db: Session):
        repository = UserRepository(db)
        super().__init__(repository, db)
        self.user_repo = repository

