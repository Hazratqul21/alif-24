import logging
import sys
from pathlib import Path
from app.core.config import settings

# Create logs directory
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Configure logging
log_format = "%(asctime)s [%(levelname)s]: %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"

# Console handler - faqat ERROR va yuqori
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.ERROR if settings.is_production else logging.INFO)
console_formatter = logging.Formatter(log_format, date_format)
console_handler.setFormatter(console_formatter)

# File handlers (production) - faqat ERROR loglar
handlers = [console_handler]

if settings.is_production:
    # Faqat ERROR va CRITICAL loglarni faylga yozamiz
    error_file_handler = logging.FileHandler(logs_dir / "error.log")
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(logging.Formatter(log_format, date_format))
    handlers.append(error_file_handler)

# Create logger
logger = logging.getLogger("alif24")
logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
logger.handlers = handlers

# Prevent duplicate logs
logger.propagate = False

