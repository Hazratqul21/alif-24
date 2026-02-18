# CRM Platform Backend Dockerfile
# Build context: project root (.)

FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY CRM/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Shared modules
COPY shared /app/shared

# Application code
COPY CRM/backend/ /app/

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
