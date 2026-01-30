from app.repositories.base_repository import BaseRepository
from app.models.game import Game
from sqlalchemy.orm import Session

class GameRepository(BaseRepository[Game]):
    def __init__(self, db: Session):
        super().__init__(Game, db)
