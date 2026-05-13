import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env")

async def fix_ertaklar():
    # Try to get variables
    user = os.getenv('POSTGRES_USER', 'postgres')
    pw = os.getenv('POSTGRES_PASSWORD', 'alif24_local_db_2026')
    db = os.getenv('POSTGRES_DB', 'alif24')
    url = os.getenv('DATABASE_URL')
    
    if not url or '://:@' in url:
        url = f'postgresql+asyncpg://{user}:{pw}@localhost:5432/{db}'
    
    # If running locally outside docker, use localhost
    if 'localhost' not in url and '@postgres:' in url:
        url = url.replace('@postgres:', '@localhost:')
    
    # Ensure it uses asyncpg
    if 'asyncpg' not in url:
        url = url.replace('postgresql://', 'postgresql+asyncpg://')

    print(f"Connecting to {url}...")
    try:
        engine = create_async_engine(url)
        async with engine.begin() as conn:
            # Check existing columns
            res = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='ertaklar'"
            ))
            existing_cols = [row[0] for row in res.fetchall()]
            print(f"Existing columns in 'ertaklar': {existing_cols}")

            # Add missing columns
            if 'teacher_id' not in existing_cols:
                print("Adding 'teacher_id'...")
                await conn.execute(text("ALTER TABLE ertaklar ADD COLUMN teacher_id VARCHAR(8)"))
                # Try to add FK, but check if teacher_profiles exists
                try:
                    await conn.execute(text("ALTER TABLE ertaklar ADD CONSTRAINT fk_story_teacher FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id) ON DELETE SET NULL"))
                except Exception as fk_err:
                    print(f"Warning: Could not add FK constraint: {fk_err}")
            
            if 'image_url' not in existing_cols:
                print("Adding 'image_url'...")
                await conn.execute(text("ALTER TABLE ertaklar ADD COLUMN image_url VARCHAR(500)"))

            if 'questions' not in existing_cols:
                print("Adding 'questions'...")
                await conn.execute(text("ALTER TABLE ertaklar ADD COLUMN questions JSONB DEFAULT '[]'"))

            if 'updated_at' not in existing_cols:
                print("Adding 'updated_at'...")
                await conn.execute(text("ALTER TABLE ertaklar ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE"))

            print("Table 'ertaklar' fixed successfully!")

        await engine.dispose()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_ertaklar())
