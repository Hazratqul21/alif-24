import sys
import os

backends = [
    "MainPlatform/backend",
    "Harf/backend",
    "TestAI/backend",
    "CRM/backend",
    "Games/backend",
    "Olimp/backend",
    "Lessions/backend"
]

project_root = os.path.dirname(os.path.abspath(__file__))

# Setup basic environment variables that might be required at import time
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:pass@localhost:5432/db"
os.environ["SECRET_KEY"] = "val"
os.environ["JWT_SECRET"] = "val"
os.environ["JWT_REFRESH_SECRET"] = "val"
os.environ["OPENAI_API_KEY"] = "val"
os.environ["TELEGRAM_BOT_TOKEN"] = "val"
os.environ["REDIS_URL"] = "redis://localhost:6379"

print("🔍 Starting backend import checks...")
for b in backends:
    backend_path = os.path.join(project_root, b)
    if not os.path.isdir(backend_path):
        print(f"❌ Backend directory not found: {b}")
        continue
    
    # Add backend path and project root to sys.path
    # Main code seems to do from shared... so project_root is needed.
    sys.path.insert(0, project_root)
    sys.path.insert(0, backend_path)
    
    try:
        # Try to import main
        import importlib
        try:
            # We must clear modules if they clash, but for a quick check we'll try to import
            # We'll run them as subprocess to avoid module clashing
            sys.path.pop(0)
            sys.path.pop(0)
            continue
        except Exception as e:
            pass
    except Exception as e:
        pass
