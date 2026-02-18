"""
Test script - Shared modullarni test qilish
"""
import sys
import os

# PYTHONPATH'ga alif24-platform papkasini qo'shish
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Test imports
print("🧪 Shared modullarni test qilish...\n")

try:
    print("1️⃣ Database models import...")
    from shared.database.models import (
        User, UserRole, StudentProfile, TeacherProfile,
        ParentProfile, StudentCoin, CoinTransaction
    )
    print("   ✅ Database models imported successfully")
    
    print("\n2️⃣ Auth modullar import...")
    from shared.auth import (
        create_access_token, verify_token,
        hash_password, verify_password
    )
    print("   ✅ Auth modules imported successfully")
    
    print("\n3️⃣ Payments modullar import...")
    from shared.payments import (
        add_coins, get_coin_balance,
        reward_lesson_completion
    )
    print("   ✅ Payments modules imported successfully")
    
    print("\n4️⃣ Database session test...")
    from shared.database import Base, get_db
    print("   ✅ Database session imported successfully")
    
    print("\n" + "="*50)
    print("✅ BARCHA TESTLAR MUVAFFAQIYATLI!")
    print("="*50)
    print("\n📚 Qo'llanma:")
    print("   - MIGRATION_PROGRESS.md - Hozirgi holat")
    print("   - ARCHITECTURE.md - To'liq arxitektura")
    print("   - shared/README.md - Shared modullar qo'llanmasi")
    
except Exception as e:
    print(f"\n❌ XATO: {e}")
    import traceback
    traceback.print_exc()

