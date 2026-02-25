import sys
from pathlib import Path

def test_imports():
    try:
        from MainPlatform.backend.app.smartkids.image_reader_router import router
        print("[OK] image_reader_router import successful")
    except Exception as e:
        print(f"[ERROR] image_reader_router import failed: {e}")

if __name__ == "__main__":
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    test_imports()
