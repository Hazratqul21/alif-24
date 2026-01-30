import sys
import os
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

from fastapi.testclient import TestClient
from sqlalchemy import text
from main import app
from app.core.database import SessionLocal

def verify_app():
    print("🚀 Starting Deep Verification...")
    client = TestClient(app)

    # 1. Check Root Endpoint
    print("\n1️⃣  Checking Root Endpoint (GET /)...")
    try:
        response = client.get("/")
        if response.status_code == 200:
            print(f"   ✅ Success: {response.json()}")
        else:
            print(f"   ❌ Failed: Status {response.status_code}, {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 2. Check OpenAPI to warn about model errors
    print("\n2️⃣  Checking OpenAPI Schema (Integrity Check)...")
    try:
        response = client.get("/api/v1/openapi.json")
        if response.status_code == 200:
            print("   ✅ OpenAPI Schema generated successfully (All models are valid)")
        else:
            print(f"   ❌ Schema Generation Failed: Status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error generating schema: {e}")

    # 3. Check Database Connection
    print("\n3️⃣  Checking Database Connection...")
    try:
        db = SessionLocal()
        # Use text() for compatible SQL execution
        result = db.execute(text("SELECT 1"))
        print("   ✅ Database connection successful (Query executed)")
        db.close()
    except Exception as e:
        print(f"   ❌ Database Connection Failed: {e}")

    # 4. List all connected routes
    print("\n4️⃣  Listing All Connected Routes:")
    print(f"   {'METHOD':<10} | {'PATH'}")
    print("   " + "-"*50)
    
    route_count = 0
    for route in app.routes:
        if hasattr(route, "methods"):
            methods = ",".join(route.methods)
            print(f"   {methods:<10} | {route.path}")
            route_count += 1
    
    print(f"\n✅ Total Connected Routes: {route_count}")

if __name__ == "__main__":
    verify_app()
