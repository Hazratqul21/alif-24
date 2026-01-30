from sqlalchemy.orm import Session
from app.repositories.profile_repository import ProfileRepository
from app.services.base_service import BaseService

class ProfileService(BaseService):
    def __init__(self, db: Session):
        repository = ProfileRepository(db)
        super().__init__(repository, db)
        self.profile_repo = repository

