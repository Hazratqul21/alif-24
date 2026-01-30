import sys
import os
from pathlib import Path

# Setup path
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

print(f"Attempting to import app.api.v1...")

try:
    from app.api.v1 import router
    print("SUCCESS: app.api.v1 imported")
except ImportError as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"FAILURE (Exception): {e}")
    import traceback
    traceback.print_exc()
