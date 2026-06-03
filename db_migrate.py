import asyncio
import asyncpg
import os

DATABASE_URL = "postgresql://postgres:alif24_secure_password@127.0.0.1:5432/alif24"

async def main():
    print("Connecting to DB...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    queries = [
        "ALTER TABLE live_quizzes ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE live_quizzes ADD COLUMN IF NOT EXISTS template_id VARCHAR(8);",
        "ALTER TABLE live_quizzes ADD COLUMN IF NOT EXISTS session_name VARCHAR(255);"
    ]
    
    for q in queries:
        try:
            print(f"Executing: {q}")
            await conn.execute(q)
            print("Success.")
        except Exception as e:
            print(f"Error: {e}")
            
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
