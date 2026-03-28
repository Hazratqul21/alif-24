import asyncio
from sqlalchemy import text
from app.core.config import settings
from shared.database.session import engine

async def migrate():
    print(f"Connecting to {settings.DATABASE_URL}")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE olympiad_reading_submissions ADD COLUMN story_id VARCHAR(8) REFERENCES olympiad_stories(id)"))
            print("Added story_id column.")
        except Exception as e:
            print("Error adding story_id:", e)
            
        try:
            await conn.execute(text("ALTER TABLE olympiad_reading_submissions ADD COLUMN read_percent FLOAT"))
            print("Added read_percent column.")
        except Exception as e:
            print("Error adding read_percent:", e)
            
        try:
            await conn.execute(text("ALTER TABLE olympiad_reading_submissions ADD COLUMN earned_coins INTEGER"))
            print("Added earned_coins column.")
        except Exception as e:
            print("Error adding earned_coins:", e)
            
        try:
            await conn.execute(text("ALTER TABLE olympiad_reading_submissions ALTER COLUMN reading_task_id DROP NOT NULL"))
            print("Made reading_task_id nullable.")
        except Exception as e:
            print("Error altering reading_task_id:", e)

if __name__ == "__main__":
    asyncio.run(migrate())
