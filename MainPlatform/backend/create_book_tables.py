import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env
project_root = Path(__file__).parent.parent.parent
load_dotenv(project_root / ".env")

async def create_book_tables():
    # Try to get variables
    user = os.getenv('POSTGRES_USER', 'postgres')
    pw = os.getenv('POSTGRES_PASSWORD', 'alif24_local_db_2026')
    db = os.getenv('POSTGRES_DB', 'alif24')
    url = os.getenv('DATABASE_URL')
    
    if not url or '://:@' in url:
        url = f'postgresql+asyncpg://{user}:{pw}@127.0.0.1:5432/{db}'
    
    # If running locally outside docker, use 127.0.0.1
    if '127.0.0.1' not in url and '@postgres:' in url:
        url = url.replace('@postgres:', '@127.0.0.1:')
    
    # Ensure it uses asyncpg
    if 'asyncpg' not in url:
        url = url.replace('postgresql://', 'postgresql+asyncpg://')

    print(f"Connecting to {url}...")
    try:
        engine = create_async_engine(url)
        async with engine.begin() as conn:
            # 1. Create 'kitoblar' table if not exists
            print("Checking/creating 'kitoblar' table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS kitoblar (
                    id VARCHAR(8) PRIMARY KEY,
                    teacher_id VARCHAR(8),
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    language VARCHAR(5) DEFAULT 'uz',
                    age_group VARCHAR(10) DEFAULT '6-8',
                    pdf_url VARCHAR(500) NOT NULL,
                    image_url VARCHAR(500),
                    is_premium BOOLEAN DEFAULT FALSE NOT NULL,
                    view_count INTEGER DEFAULT 0,
                    questions JSONB DEFAULT '[]',
                    test JSONB DEFAULT '[]',
                    questions_limit INTEGER DEFAULT 3,
                    test_limit INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            print("Table 'kitoblar' created or verified.")

            # Try to add FK constraint for teacher_id if possible
            try:
                await conn.execute(text("""
                    ALTER TABLE kitoblar 
                    ADD CONSTRAINT fk_book_teacher 
                    FOREIGN KEY (teacher_id) REFERENCES teacher_profiles(id) 
                    ON DELETE SET NULL
                """))
                print("Added foreign key constraint 'fk_book_teacher' to 'kitoblar'.")
            except Exception as fk_err:
                print(f"Note: FK fk_book_teacher could not be added (already exists or teacher_profiles missing): {fk_err}")

            # 2. Create 'book_reading_records' table if not exists
            print("Checking/creating 'book_reading_records' table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS book_reading_records (
                    id VARCHAR(8) PRIMARY KEY,
                    student_user_id VARCHAR(8) NOT NULL,
                    book_id VARCHAR(8) NOT NULL,
                    quiz_score INTEGER,
                    test_score INTEGER,
                    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            print("Table 'book_reading_records' created or verified.")

            # Try to add FK constraints if possible
            try:
                await conn.execute(text("""
                    ALTER TABLE book_reading_records 
                    ADD CONSTRAINT fk_record_student 
                    FOREIGN KEY (student_user_id) REFERENCES users(id) 
                    ON DELETE CASCADE
                """))
                print("Added foreign key 'fk_record_student'.")
            except Exception as fk_err:
                print(f"Note: FK fk_record_student could not be added: {fk_err}")

            try:
                await conn.execute(text("""
                    ALTER TABLE book_reading_records 
                    ADD CONSTRAINT fk_record_book 
                    FOREIGN KEY (book_id) REFERENCES kitoblar(id) 
                    ON DELETE CASCADE
                """))
                print("Added foreign key 'fk_record_book'.")
            except Exception as fk_err:
                print(f"Note: FK fk_record_book could not be added: {fk_err}")

            print("Database check completed successfully!")

        await engine.dispose()
    except Exception as e:
        print(f"Error checking/creating tables: {e}")

if __name__ == "__main__":
    asyncio.run(create_book_tables())
