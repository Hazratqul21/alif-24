import asyncio
import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Mock the environment or use local DB config
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://postgres:postgres@localhost:5432/alif24'

from app.core.config import settings
from app.services.rating_service import RatingService
from shared.database.models.enums import RatingPeriod

engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with AsyncSessionLocal() as db:
        svc = RatingService(db)
        # Using a dummy classroom id for syntax check or if we don't have one
        res, total = await svc.get_classroom_leaderboard('cf51f498-3f5f-40ed-87ba-517b6a4a4087', RatingPeriod.all_time)
        print("Total:", total)
        print("Res:", res)

if __name__ == '__main__':
    asyncio.run(main())
