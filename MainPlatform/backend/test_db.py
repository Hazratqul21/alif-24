import asyncio
import sys
import os

# Set up environment path to find the app module
sys.path.insert(0, '/app')

from shared.database import SessionLocal
from shared.database.models.platform_content import PlatformContent
from sqlalchemy import select
from datetime import datetime, timezone

async def test_db():
    try:
        async with SessionLocal() as db:
            print("1. Querying PlatformContent...")
            stmt = select(PlatformContent).where(PlatformContent.key == 'public_offer')
            result = await db.execute(stmt)
            content = result.scalars().first()
            
            if content:
                print(f"2. Found content: {content.key}")
                print("3. Attempting to update...")
                content.value = {"text": "test"}
                content.updated_at = datetime.now(timezone.utc)
                await db.commit()
                print("4. Update successful!")
            else:
                print("2. Content not found, attempting to insert...")
                content = PlatformContent(key='public_offer', value={'text': 'test'})
                db.add(content)
                await db.commit()
                print("4. Insert successful!")
                
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_db())
