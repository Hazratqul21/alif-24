"""
PostgreSQL database ni to'liq qayta yaratish skripti
"""
from app.core.database import Base, engine
from sqlalchemy import text
# Import all models to ensure they are registered in Base.metadata
from app.models import *


print("🔄 Database ni to'liq qayta yaratish...")

# 1. Drop all tables
print("1️⃣ Barcha jadvallarni o'chirish...")
Base.metadata.drop_all(bind=engine)

# 2. Create all tables (bu enum tiplarini ham yaratadi)
print("2️⃣ Barcha jadvallarni yaratish...")
Base.metadata.create_all(bind=engine)

# 3. Verify tables
print("3️⃣ Jadvallarni tekshirish...")
with engine.connect() as conn:
    if engine.dialect.name == 'postgresql':
        result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
    else:
        # SQLite
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"))
    
    tables = [row[0] for row in result]
    print(f"   Yaratilgan jadvallar ({len(tables)}): {', '.join(tables[:5])}...")

print()
print("✅ Database muvaffaqiyatli qayta yaratildi!")
print()
print("📊 Database tafsilotlari:")
print(f"   Database: alif24_db")
print(f"   Host: localhost:5432")
print(f"   Jadvallar soni: {len(tables)}")

