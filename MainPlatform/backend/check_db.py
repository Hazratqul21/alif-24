import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import inspect
import os

async def check_schema():
    # Try to get DATABASE_URL from environment
    url = os.getenv('DATABASE_URL')
    if not url:
        # Fallback to a common default or look in .env if needed
        url = 'postgresql+asyncpg://postgres:alif24_secure_password@postgres:5432/alif24'
    
    # If running locally outside docker, use localhost
    if 'localhost' not in url and 'postgres' in url and not os.path.exists('/.dockerenv'):
        url = url.replace('@postgres:', '@localhost:')

    print(f"Connecting to {url}...")
    try:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            def get_cols(connection):
                inspector = inspect(connection)
                return inspector.get_columns('lessons')
            
            cols = await conn.run_sync(get_cols)
            print("Columns in 'lessons' table:")
            for col in cols:
                print(f" - {col['name']} ({col['type']})")
        await engine.dispose()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
