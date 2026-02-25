import os
import subprocess
import py_compile

repo_root = "/Users/hazratqul/Desktop/alif24-platform"
backends_to_audit = ["Olimp", "Harf", "CRM", "Games", "TestAI"]

issues_found = []

for project in backends_to_audit:
    project_dir = os.path.join(repo_root, project, "backend")
    if not os.path.exists(project_dir):
        continue
        
    print(f"\n--- Checking {project} Backend ---")
    
    # 1. Syntax Check
    for root, dirs, files in os.walk(project_dir):
        if "__pycache__" in root or ".venv" in root: continue
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                try:
                    py_compile.compile(filepath, doraise=True)
                except py_compile.PyCompileError as e:
                    issues_found.append(f"[{project}] SYNTAX ERROR: {e}")
                    
    # 2. Subprocess Import Check
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/db"
    env["REDIS_URL"] = "redis://localhost:6379/1"
    env["JWT_SECRET"] = "dummy_secret"
    
    cmd = ["python3", "-c", "import sys; sys.path.insert(0, '.'); import main; print('OK')"]
    res = subprocess.run(cmd, cwd=project_dir, env=env, capture_output=True, text=True)
    if res.returncode != 0:
        issues_found.append(f"[{project}] IMPORT CRASH:\n{res.stderr.strip()}")
    else:
        print(f"[{project}] Import OK")

if issues_found:
    print("\nISSUES:")
    for i in issues_found: print(i)
else:
    print("\nALL CLEAR!")
