import sys
from pathlib import Path

def test_imports():
    try:
        from shared.database.models.lesson import LessonStatus
        print("[OK] LessonStatus import successful")
    except Exception as e:
        print(f"[ERROR] LessonStatus import failed: {e}")

    try:
        from shared.services.azure_speech_service import get_voice_for_language
        print("[OK] get_voice_for_language import successful")
    except Exception as e:
        print(f"[ERROR] get_voice_for_language import failed: {e}")

if __name__ == "__main__":
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    test_imports()
