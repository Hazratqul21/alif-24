#!/usr/bin/env python3
"""
Alif24 Platform Orchestrator
============================
Barcha platformalarni (backend + frontend) bitta joydan boshqarish.

Ishga tushirish:
    python start_all.py                    # Barcha backend + frontend
    python start_all.py --backend          # Faqat barcha backendlar
    python start_all.py --frontend         # Faqat barcha frontendlar
    python start_all.py --main             # MainPlatform (backend + frontend)
    python start_all.py --exclude testai testai-fe  # TestAI'siz
    python start_all.py --list             # Platformalar ro'yxati
"""

import subprocess
import sys
import os
import signal
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional
import threading
import queue
from dotenv import load_dotenv

# Load environment variables
load_dotenv("MainPlatform/backend/.env")

# Platform konfiguratsiyasi - Backend
BACKENDS = {
    "main": {
        "name": "MainPlatform [BE]",
        "path": "MainPlatform/backend",
        "port": 8000,
        "command": [sys.executable, "main.py"],
        "required": True,
    },
    "harf": {
        "name": "Harf [BE]",
        "path": "Harf/backend", 
        "port": 8001,
        "command": [sys.executable, "main.py"],
        "required": False,
    },
    "testai": {
        "name": "TestAI [BE]",
        "path": "TestAI/backend",
        "port": 8002,
        "command": [sys.executable, "main.py"],
        "required": False,
    },
    "crm": {
        "name": "CRM [BE]",
        "path": "CRM/backend",
        "port": 8003,
        "command": [sys.executable, "main.py"],
        "required": False,
    },
    "games": {
        "name": "Games [BE]",
        "path": "Games/backend",
        "port": 8004,
        "command": [sys.executable, "main.py"],
        "required": False,
    },
    "olimp": {
        "name": "Olimp [BE]",
        "path": "Olimp/backend",
        "port": 8005,
        "command": [sys.executable, "main.py"],
        "required": False,
    },
    "lessions": {
        "name": "Lessions [BE]",
        "path": "Lessions/backend",
        "port": 8006,
        "command": [sys.executable, "main.py"],
        "required": False,
    },
}

# Frontend konfiguratsiyasi
FRONTENDS = {
    "main-fe": {
        "name": "MainPlatform [FE]",
        "path": "MainPlatform/frontend",
        "port": 5173,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
    "harf-fe": {
        "name": "Harf [FE]",
        "path": "Harf/frontend",
        "port": 5174,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
    "testai-fe": {
        "name": "TestAI [FE]",
        "path": "TestAI/frontend",
        "port": 5175,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
    "crm-fe": {
        "name": "CRM [FE]",
        "path": "CRM/frontend",
        "port": 5176,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
    "games-fe": {
        "name": "Games [FE]",
        "path": "Games/frontend",
        "port": 5177,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
    "olimp-fe": {
        "name": "Olimp [FE]",
        "path": "Olimp/frontend",
        "port": 5178,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
    "lessions-fe": {
        "name": "Lessions [FE]",
        "path": "Lessions/frontend",
        "port": 5179,
        "command": ["npm", "run", "dev"],
        "required": False,
    },
}

# Birlashtirilgan platformalar
PLATFORMS = {**BACKENDS, **FRONTENDS}

# Global process tracker
processes: Dict[str, subprocess.Popen] = {}
stop_event = threading.Event()


class Colors:
    """Terminal ranglari"""
    MAIN = "\033[95m"      # Magenta - MainPlatform
    HARF = "\033[94m"      # Blue
    TESTAI = "\033[92m"    # Green
    CRM = "\033[93m"       # Yellow
    GAMES = "\033[96m"     # Cyan
    MAIN_FE = "\033[35m"   # Purple - MainPlatform Frontend
    HARF_FE = "\033[34m"   # Blue Frontend
    TESTAI_FE = "\033[32m" # Green Frontend
    CRM_FE = "\033[33m"    # Yellow Frontend
    GAMES_FE = "\033[36m"  # Cyan Frontend
    OLIMP = "\033[91m"     # Red (Light) - Olimp
    LESSIONS = "\033[97m"  # White - Lessions
    OLIMP_FE = "\033[31m"  # Red (Dark) - Olimp Frontend
    LESSIONS_FE = "\033[37m" # Gray - Lessions Frontend
    ERROR = "\033[91m"     # Red
    RESET = "\033[0m"
    BOLD = "\033[1m"


PLATFORM_COLORS = {
    "main": Colors.MAIN,
    "harf": Colors.HARF,
    "testai": Colors.TESTAI,
    "crm": Colors.CRM,
    "games": Colors.GAMES,
    "main-fe": Colors.MAIN_FE,
    "harf-fe": Colors.HARF_FE,
    "testai-fe": Colors.TESTAI_FE,
    "crm-fe": Colors.CRM_FE,
    "games-fe": Colors.GAMES_FE,
    "olimp": Colors.OLIMP,
    "lessions": Colors.LESSIONS,
    "olimp-fe": Colors.OLIMP_FE,
    "lessions-fe": Colors.LESSIONS_FE,
}


def print_banner():
    """Chiroyli banner chiqarish"""
    banner = f"""
{Colors.BOLD}{Colors.MAIN}
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     █████╗ ██╗     ██╗███████╗██████╗ ██╗  ██╗           ║
    ║    ██╔══██╗██║     ██║██╔════╝╚════██╗██║  ██║           ║
    ║    ███████║██║     ██║█████╗   █████╔╝███████║           ║
    ║    ██╔══██║██║     ██║██╔══╝  ██╔═══╝ ╚════██║           ║
    ║    ██║  ██║███████╗██║██║     ███████╗     ██║           ║
    ║    ╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝     ╚═╝           ║
    ║                                                           ║
    ║              🚀 Platform Orchestrator 🚀                  ║
    ╚═══════════════════════════════════════════════════════════╝
{Colors.RESET}"""
    print(banner)


def log(platform: str, message: str, error: bool = False):
    """Platform logi - rang bilan"""
    color = Colors.ERROR if error else PLATFORM_COLORS.get(platform, Colors.RESET)
    name = PLATFORMS.get(platform, {}).get("name", platform.upper())
    port = PLATFORMS.get(platform, {}).get("port", "")
    prefix = f"[{name}:{port}]" if port else f"[{name}]"
    print(f"{color}{prefix}{Colors.RESET} {message}")


def stream_output(process: subprocess.Popen, platform: str, output_queue: queue.Queue):
    """Process outputini stream qilish"""
    try:
        for line in iter(process.stdout.readline, ''):
            if stop_event.is_set():
                break
            if line:
                output_queue.put((platform, line.strip(), False))
    except Exception as e:
        output_queue.put((platform, f"Stream error: {e}", True))


def output_printer(output_queue: queue.Queue):
    """Output queue'dan chiqarish"""
    while not stop_event.is_set():
        try:
            platform, message, is_error = output_queue.get(timeout=0.1)
            log(platform, message, is_error)
        except queue.Empty:
            continue
        except Exception:
            break


def start_platform(platform_key: str, config: dict, root_path: Path) -> Optional[subprocess.Popen]:
    """Bitta platformani ishga tushirish"""
    platform_path = root_path / config["path"]
    
    if not platform_path.exists():
        log(platform_key, f"❌ Path topilmadi: {platform_path}", error=True)
        return None
    
    # Backend yoki frontend tekshirish
    is_frontend = platform_key.endswith("-fe")
    
    if is_frontend:
        # Frontend uchun package.json va node_modules tekshirish
        package_json = platform_path / "package.json"
        node_modules = platform_path / "node_modules"
        
        if not package_json.exists():
            log(platform_key, f"❌ package.json topilmadi: {package_json}", error=True)
            return None
        
        if not node_modules.exists():
            log(platform_key, "⚠️ node_modules topilmadi! 'npm install' ishga tushiring", error=True)
            log(platform_key, "📦 node_modules o'rnatilmoqda... (Bu biroz vaqt oladi)", error=False)
            try:
                install_result = subprocess.run(
                    ["npm", "install"],
                    cwd=str(platform_path),
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 daqiqa
                )
                if install_result.returncode != 0:
                    log(platform_key, f"❌ npm install xatolik: {install_result.stderr}", error=True)
                    return None
                log(platform_key, "✅ node_modules o'rnatildi", error=False)
            except subprocess.TimeoutExpired:
                log(platform_key, "❌ npm install timeout (5 min)", error=True)
                return None
            except Exception as e:
                log(platform_key, f"❌ npm install xatolik: {e}", error=True)
                return None
    else:
        # Backend uchun main.py tekshirish
        main_file = platform_path / "main.py"
        if not main_file.exists():
            log(platform_key, f"❌ main.py topilmadi: {main_file}", error=True)
            return None
    
    log(platform_key, f"🚀 Ishga tushirilmoqda... (Port: {config['port']})")
    
    try:
        # Environment sozlash
        env = os.environ.copy()
        env["PYTHONPATH"] = str(root_path)
        env["PLATFORM_NAME"] = config["name"]
        
        # npm uchun maxsus sozlamalar
        if is_frontend:
            # Windows'da npm.cmd ishlatish
            command = config["command"].copy()
            if sys.platform == "win32" and command[0] == "npm":
                command[0] = "npm.cmd"
        else:
            command = config["command"]
        
        process = subprocess.Popen(
            command,
            cwd=str(platform_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
        )
        
        log(platform_key, f"✅ Ishga tushdi (PID: {process.pid})")
        return process
        
    except Exception as e:
        log(platform_key, f"❌ Xatolik: {e}", error=True)
        return None


def stop_all():
    """Barcha processlarni to'xtatish"""
    print(f"\n{Colors.BOLD}🛑 Barcha platformalar to'xtatilmoqda...{Colors.RESET}")
    stop_event.set()
    
    for platform_key, process in processes.items():
        if process and process.poll() is None:
            log(platform_key, "⏹️ To'xtatilmoqda...")
            try:
                if sys.platform == "win32":
                    process.send_signal(signal.CTRL_BREAK_EVENT)
                else:
                    process.terminate()
                process.wait(timeout=5)
                log(platform_key, "✅ To'xtatildi")
            except subprocess.TimeoutExpired:
                log(platform_key, "⚠️ Majburiy o'chirilmoqda...")
                process.kill()
            except Exception as e:
                log(platform_key, f"❌ Xatolik: {e}", error=True)


def signal_handler(signum, frame):
    """Signal handler - Ctrl+C"""
    stop_all()
    sys.exit(0)


def check_port_available(port: int) -> bool:
    """Port bo'shligini tekshirish"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0


def main():
    parser = argparse.ArgumentParser(description="Alif24 Platform Orchestrator")
    parser.add_argument("--main", action="store_true", help="Faqat MainPlatform (backend va frontend)")
    parser.add_argument("--backend", action="store_true", help="Faqat backendlar (default: backend + frontend)")
    parser.add_argument("--frontend", action="store_true", help="Faqat frontendlar")
    parser.add_argument("--only", nargs="+", choices=list(PLATFORMS.keys()), 
                       help="Faqat tanlangan platformalar")
    parser.add_argument("--exclude", nargs="+", choices=list(PLATFORMS.keys()),
                       help="Bu platformalarni ishga tushirmaslik")
    parser.add_argument("--list", action="store_true", help="Platformalar ro'yxati")
    
    args = parser.parse_args()
    
    if args.list:
        print(f"\n{Colors.BOLD}📋 Mavjud platformalar:{Colors.RESET}")
        print(f"\n{Colors.BOLD}⚙️  BACKENDS:{Colors.RESET}")
        for key, config in BACKENDS.items():
            status = "🔵 Asosiy" if config["required"] else "⚪ Qo'shimcha"
            print(f"  {PLATFORM_COLORS[key]}{config['name']}{Colors.RESET} - Port {config['port']} {status}")
        
        print(f"\n{Colors.BOLD}🎨 FRONTENDS:{Colors.RESET}")
        for key, config in FRONTENDS.items():
            print(f"  {PLATFORM_COLORS[key]}{config['name']}{Colors.RESET} - Port {config['port']}")
        
        print(f"\n{Colors.BOLD}💡 Ishlatish:{Colors.RESET}")
        print(f"  python start_all.py                    # Hammasi (backend + frontend)")
        print(f"  python start_all.py --backend          # Faqat backendlar")
        print(f"  python start_all.py --frontend         # Faqat frontendlar")
        print(f"  python start_all.py --main             # MainPlatform (backend + frontend)")
        print(f"  python start_all.py --exclude testai   # TestAI'siz boshqalarini ishga tushirish")
        return
    
    print_banner()
    
    # Signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    if sys.platform == "win32":
        signal.signal(signal.SIGBREAK, signal_handler)
    
    root_path = Path(__file__).parent
    
    # Qaysi platformalarni ishga tushirish
    platforms_to_start = []
    
    if args.main:
        # Faqat MainPlatform (backend + frontend)
        platforms_to_start = ["main", "main-fe"]
    elif args.backend:
        # Faqat backendlar
        platforms_to_start = list(BACKENDS.keys())
    elif args.frontend:
        # Faqat frontendlar
        platforms_to_start = list(FRONTENDS.keys())
    elif args.only:
        # Tanlangan platformalar
        platforms_to_start = args.only
    else:
        # Default: hammasi (backend + frontend)
        platforms_to_start = list(PLATFORMS.keys())
    
    if args.exclude:
        platforms_to_start = [p for p in platforms_to_start if p not in args.exclude]
    
    # Portlarni tekshirish
    print(f"\n{Colors.BOLD}🔍 Portlar tekshirilmoqda...{Colors.RESET}")
    for platform_key in platforms_to_start:
        config = PLATFORMS[platform_key]
        if not check_port_available(config["port"]):
            log(platform_key, f"⚠️ Port {config['port']} band!", error=True)
    
    # Output queue va printer thread
    output_queue = queue.Queue()
    printer_thread = threading.Thread(target=output_printer, args=(output_queue,), daemon=True)
    printer_thread.start()
    
    # Platformalarni ishga tushirish
    print(f"\n{Colors.BOLD}🚀 Platformalar ishga tushirilmoqda...{Colors.RESET}\n")
    
    stream_threads = []
    for platform_key in platforms_to_start:
        config = PLATFORMS[platform_key]
        process = start_platform(platform_key, config, root_path)
        
        if process:
            processes[platform_key] = process
            # Output stream thread
            thread = threading.Thread(
                target=stream_output, 
                args=(process, platform_key, output_queue),
                daemon=True
            )
            thread.start()
            stream_threads.append(thread)
        
        time.sleep(0.5)  # Platformalar orasida biroz kutish
    
    if not processes:
        print(f"{Colors.ERROR}❌ Hech qanday platform ishga tushmadi!{Colors.RESET}")
        return
    
    # Status
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}✅ Ishga tushgan platformalar:{Colors.RESET}")
    
    # Backendlarni ko'rsatish
    backends_running = [key for key in processes if key in BACKENDS]
    if backends_running:
        print(f"\n{Colors.BOLD}  ⚙️  BACKENDS:{Colors.RESET}")
        for platform_key in backends_running:
            config = PLATFORMS[platform_key]
            color = PLATFORM_COLORS[platform_key]
            print(f"     {color}• {config['name']}{Colors.RESET} - http://localhost:{config['port']}")
    
    # Frontendlarni ko'rsatish
    frontends_running = [key for key in processes if key in FRONTENDS]
    if frontends_running:
        print(f"\n{Colors.BOLD}  🎨 FRONTENDS:{Colors.RESET}")
        for platform_key in frontends_running:
            config = PLATFORMS[platform_key]
            color = PLATFORM_COLORS[platform_key]
            print(f"     {color}• {config['name']}{Colors.RESET} - http://localhost:{config['port']}")
    
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"\n{Colors.BOLD}💡 To'xtatish uchun: Ctrl+C{Colors.RESET}\n")
    
    # Processlarni kuzatish
    try:
        while True:
            all_stopped = True
            for platform_key, process in list(processes.items()):
                if process.poll() is None:
                    all_stopped = False
                else:
                    exit_code = process.returncode
                    if exit_code != 0:
                        log(platform_key, f"❌ To'xtadi (exit code: {exit_code})", error=True)
                    del processes[platform_key]
            
            if all_stopped:
                print(f"\n{Colors.BOLD}⚠️ Barcha platformalar to'xtadi{Colors.RESET}")
                break
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        pass
    finally:
        stop_all()


if __name__ == "__main__":
    main()
