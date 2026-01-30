import sys
import os
from pathlib import Path

# Add current dir to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from sqlalchemy import create_engine
    # Import Base and Models to register them
    from app.core.database import Base
    from app.models import rbac_models, lesson, progress, game_session, student_achievement
    
    # Try SQLite in-memory
    engine = create_engine('sqlite:///:memory:')
    
    print("🔄 Attempting to create tables in SQLite...")
    Base.metadata.create_all(engine)
    print("✅ Success! Models are compatible with SQLite.")
    
except Exception as e:
    print(f"❌ Failed: {e}")
