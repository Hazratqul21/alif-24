import logging
import sys
from pathlib import Path
from app.core.config import settings

# Create logs directory handling for read-only filesystems (Vercel)
try:
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    can_write_logs = True
except OSError:
    # Read-only filesystem (e.g., Vercel)
    can_write_logs = False

# Configure logging
log_format = "%(asctime)s [%(levelname)s]: %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"

# Console handler - always active
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO) # Always capture INFO and above to console/Vercel logs
console_formatter = logging.Formatter(log_format, date_format)
console_handler.setFormatter(console_formatter)

handlers = [console_handler]

# File handlers only if writable
if settings.is_production and can_write_logs:
    try:
        error_file_handler = logging.FileHandler(logs_dir / "error.log")
        error_file_handler.setLevel(logging.ERROR)
        error_file_handler.setFormatter(logging.Formatter(log_format, date_format))
        handlers.append(error_file_handler)
    except OSError:
        pass

# Create logger
logger = logging.getLogger("alif24")
logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger.handlers = handlers

# Prevent duplicate logs
logger.propagate = False

