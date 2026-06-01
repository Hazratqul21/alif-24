import sys
import os
import asyncio

sys.path.append(os.path.join(os.getcwd(), 'MainPlatform', 'backend'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from shared.database.config import settings
from shared.database.models.reading_rating import RatingPeriod
from app.services.rating_service import RatingService

async def main():
    try:
        engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        async with async_session() as db:
            service = RatingService(db)
            print("Running get_student_leaderboard...")
            res = await service.get_student_leaderboard(RatingPeriod.all_time)
            print(res)
            
            print("Running get_organization_dashboard_stats...")
            res2 = await service.get_organization_dashboard_stats("40124765", RatingPeriod.all_time)
            print(res2)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
