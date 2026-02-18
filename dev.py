#!/usr/bin/env python3
"""
Development Helper - Bitta platformani alohida ishga tushirish
===============================================================

Ishlatish:
    python dev.py testai     # Faqat TestAI
    python dev.py harf       # Faqat Harf
    python dev.py crm        # Faqat CRM
    python dev.py games      # Faqat Games
    python dev.py main       # Faqat MainPlatform

Bu script boshqa platformalarga ta'sir qilmaydi.
Masalan, TestAI ustida ishlayotganda boshqa platformalar ishlashda davom etadi.
"""

import subprocess
import sys
import os
from pathlib import Path

PLATFORMS = {
    "main": ("MainPlatform", 8000),
    "harf": ("Harf", 8001),
    "testai": ("TestAI", 8002),
    "crm": ("CRM", 8003),
    "games": ("Games", 8004),
    "olimp": ("Olimp", 8005),
    "lessions": ("Lessions", 8006),
}

def main():
    if len(sys.argv) < 2:
        print("❌ Platform nomini kiriting!")
        print("\nMavjud platformalar:")
        for key, (name, port) in PLATFORMS.items():
            print(f"  python dev.py {key}  # {name} (Port {port})")
        sys.exit(1)
    
    platform_key = sys.argv[1].lower()
    
    if platform_key not in PLATFORMS:
        print(f"❌ Noto'g'ri platform: {platform_key}")
        print(f"Mavjud: {', '.join(PLATFORMS.keys())}")
        sys.exit(1)
    
    name, port = PLATFORMS[platform_key]
    root_path = Path(__file__).parent
    platform_path = root_path / name / "backend"
    
    if not platform_path.exists():
        print(f"❌ Path topilmadi: {platform_path}")
        sys.exit(1)
    
    print(f"""
╔══════════════════════════════════════╗
║  🔧 Development Mode                 ║
║  Platform: {name:20}    ║
║  Port: {port}                          ║
║  Path: {str(platform_path)[:25]:25} ║
╚══════════════════════════════════════╝
    """)
    
    # Environment
    env = os.environ.copy()
    env["PYTHONPATH"] = str(root_path)
    env["DEV_MODE"] = "true"
    
    # Uvicorn bilan hot-reload
    try:
        subprocess.run(
            ["python", "-m", "uvicorn", "main:app", "--reload", "--port", str(port)],
            cwd=str(platform_path),
            env=env
        )
    except KeyboardInterrupt:
        print("\n👋 To'xtatildi")


if __name__ == "__main__":
    main()
