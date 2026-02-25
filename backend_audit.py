import os
import sys
import py_compile
import traceback
import importlib

# Add root to python path to resolve 'shared' and app imports
repo_root = "/Users/hazratqul/Desktop/alif24-platform"
sys.path.insert(0, repo_root)

# Mock some env variables so apps don't crash on import
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/db"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"
os.environ["JWT_SECRET"] = "dummy_secret"

backends_to_audit = ["Olimp", "Harf", "CRM", "Games", "TestAI"]
issues_found = []

for project in backends_to_audit:
    project_dir = os.path.join(repo_root, project, "backend")
    
    if not os.path.exists(project_dir):
        issues_found.append(f"[{project}] Directory not found: {project_dir}")
        continue
    
    print(f"\n--- Checking {project} Backend ---")
    
    # 1. Syntax Check
    syntax_errors = 0
    for root, dirs, files in os.walk(project_dir):
        if "__pycache__" in root or ".venv" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                try:
                    py_compile.compile(filepath, doraise=True)
                except py_compile.PyCompileError as e:
                    issues_found.append(f"[{project}] SYNTAX ERROR in {file}:\n{e}")
                    syntax_errors += 1
    
    if syntax_errors == 0:
        print(f"[{project}] Syntax check passed.")
    else:
        print(f"[{project}] Found {syntax_errors} syntax error(s).")

    # 2. Main Module Import Check
    # This checks if the project actually starts or crashes immediately due to bad imports
    try:
        sys.path.insert(0, project_dir)
        importlib.import_module("main")
        print(f"[{project}] Import check passed (main.py loads successfully without ModuleNotFoundError).")
        # Cleanup module so it doesn't conflict with the next project
        if "main" in sys.modules:
            del sys.modules["main"]
        sys.path.pop(0)
    except Exception as e:
        err_msg = traceback.format_exc()
        issues_found.append(f"[{project}] IMPORT OR STARTUP CRASH in main.py:\n{str(e)}\n{err_msg.splitlines()[-2]}")
        sys.path.pop(0)

print("\n\n" + "="*50)
print("AUDIT SUMMARY:")
if not issues_found:
    print("✅ No syntax or basic startup import bugs found in the remaining backends!")
else:
    for issue in issues_found:
        print(f"❌ {issue}")
