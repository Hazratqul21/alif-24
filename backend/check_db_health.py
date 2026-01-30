import sys
from pathlib import Path
import os

# Setup path
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy import text

def check_health():
    try:
        db = SessionLocal()
        print("✅ Database connection successful")
        
        # Check users table
        try:
            count = db.query(User).count()
            print(f"✅ Users table accessible. Count: {count}")
        except Exception as e:
            print(f"❌ Error querying users table: {e}")
            return False
            
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = check_health()
    sys.exit(0 if success else 1)
