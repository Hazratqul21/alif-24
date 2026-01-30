from app.services.base_service import BaseService
from app.repositories.game_repository import GameRepository
from sqlalchemy.orm import Session

class GameService(BaseService):
    def __init__(self, db: Session):
        repository = GameRepository(db)
        super().__init__(repository, db)
        self.game_repo = repository
