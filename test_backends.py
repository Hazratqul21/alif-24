import sys
import os
import subprocess

backends = [
    "MainPlatform",
    "Harf",
    "TestAI",
    "CRM",
    "Games",
    "Olimp",
    "Lessions"
]

project_root = os.path.dirname(os.path.abspath(__file__))

env = os.environ.copy()
env["DATABASE_URL"] = "postgresql+asyncpg://postgres:pass@localhost:5432/db"
env["JWT_SECRET"] = "val"
env["JWT_REFRESH_SECRET"] = "val"
env["SECRET_KEY"] = "val"
env["OPENAI_API_KEY"] = "val"
env["TELEGRAM_BOT_TOKEN"] = "val"
env["REDIS_URL"] = "redis://localhost:6379"
env["AZURE_SPEECH_KEY"] = "val"
env["AZURE_SPEECH_REGION"] = "val"
env["AZURE_OPENAI_KEY"] = "val"
env["AZURE_OPENAI_ENDPOINT"] = "https://val.com"
env["AZURE_OPENAI_DEPLOYMENT_NAME"] = "val"
env["AZURE_OPENAI_API_VERSION"] = "val"
env["PYTHONPATH"] = project_root

failed_backends = []

for b in backends:
    backend_path = os.path.join(project_root, b, "backend")
    if not os.path.isdir(backend_path):
        print(f"❌ Backend directory not found: {b}")
        continue
    
    print(f"Testing {b} Backend...")
    try:
        # Run python -c "import main" in the backend directory
        result = subprocess.run(
            ["python3", "-c", "import main"],
            cwd=backend_path,
            env=env,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"✅ {b} Backend OK")
        else:
            print(f"❌ {b} Backend FAILED")
            print("--- ERROR START ---")
            print(result.stderr)
            print("--- ERROR END ---")
            failed_backends.append(b)
    except Exception as e:
        print(f"Exception: {e}")

if failed_backends:
    sys.exit(1)
else:
    print("All backends imported successfully!")
