import sys
import os
from pathlib import Path
from fastapi import FastAPI, APIRouter

# 1. PYTHONPATH setup (copied from main.py)
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

print(f"Current dir: {current_dir}")
print(f"Sys path: {sys.path}")

# 2. Init files check (copied from main.py)
def ensure_init_files():
    """Ensure all __init__.py files exist"""
    dirs_to_check = [
        current_dir / "app",
        current_dir / "app" / "core",
        current_dir / "app" / "api",
        current_dir / "app" / "harf",
        current_dir / "app" / "rharf",
        current_dir / "app" / "letters",
        current_dir / "app" / "unified",
        current_dir / "app" / "api" / "v1",
    ]
    
    for dir_path in dirs_to_check:
        if dir_path.exists():
            init_file = dir_path / "__init__.py"
            if not init_file.exists():
                print(f"⚠️  Creating {init_file.relative_to(current_dir)}")
                init_file.touch()

ensure_init_files()

# 3. Import attempts
print("\n--- IMPORT SEQUENCE START ---")

try:
    from app.core.config import settings
    print(f"✅ Settings imported. Prefix: {settings.API_PREFIX}")
except ImportError as e:
    print(f"❌ Settings import failed: {e}")

try:
    from app.api.v1 import router as api_router
    print("✅ API router imported")
except Exception as e:
    print(f"❌ API router import error: {e}")
    import traceback
    traceback.print_exc()

try:
    from app.letters.router import router as letters_router
    print("✅ Letters router imported")
except Exception as e:
    print(f"❌ Letters router import error: {e}")
    import traceback
    traceback.print_exc()

print("--- IMPORT SEQUENCE END ---")
