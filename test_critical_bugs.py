
import sys
import os
import asyncio
import inspect

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

async def test_critical_bugs():
    print("🧪 CRITICAL BUGS VERIFICATION\n")

    # 1. Bug #1: shared/database/__init__.py import error
    print("1️⃣ Testing shared.database import...")
    try:
        from shared.database import AsyncSessionLocal, init_db
        print("   ✅ AsyncSessionLocal imported successfully")
        print("   ✅ init_db imported successfully")
    except ImportError as e:
        print(f"   ❌ ImportError: {e}")
        return
    except Exception as e:
        print(f"   ❌ Unexpected Error: {e}")
        return

    # 2. Bug #2: MainPlatform init_db async/sync check
    print("\n2️⃣ Testing init_db type...")
    if inspect.iscoroutinefunction(init_db):
        print("   ✅ init_db is ASYNC function")
        print("   ℹ️ MainPlatform `await init_db()` is CORRECT")
    else:
        print("   ❌ init_db is SYNC function")
        print("   ℹ️ MainPlatform `await init_db()` is INCORRECT")

    # 3. Check AsyncSessionLocal type
    print("\n3️⃣ Testing AsyncSessionLocal type...")
    from sqlalchemy.ext.asyncio import async_sessionmaker
    if isinstance(AsyncSessionLocal, async_sessionmaker):
         print("   ✅ AsyncSessionLocal is async_sessionmaker")
    else:
         print(f"   ❌ AsyncSessionLocal is {type(AsyncSessionLocal)}")

if __name__ == "__main__":
    asyncio.run(test_critical_bugs())
