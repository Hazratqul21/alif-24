from sqlalchemy.orm import Session
from app.repositories.avatar_repository import AvatarRepository
from app.services.base_service import BaseService

class AvatarService(BaseService):
    def __init__(self, db: Session):
        repository = AvatarRepository(db)
        super().__init__(repository, db)
        self.avatar_repo = repository

