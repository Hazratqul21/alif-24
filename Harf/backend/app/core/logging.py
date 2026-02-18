"""Harf Platform Logging"""

import logging
import sys

# Create logger
logger = logging.getLogger("harf")
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
console_handler.setFormatter(formatter)

# Add handler
if not logger.handlers:
    logger.addHandler(console_handler)
