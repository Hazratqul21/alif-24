#!/bin/bash
# Azure App Service Startup Script for FastAPI

set -e


echo "🚀 Starting Alif24 Backend..."
echo "📂 Current Directory: $(pwd)"

# Ensure unbuffered output so App Service captures tracebacks immediately
export PYTHONUNBUFFERED=1

# 1. Azure uchun virtual environment path
if [ -d "/antenv/bin" ]; then
    echo "🔧 Activating Azure virtual environment..."
    source /antenv/bin/activate
elif [ -d "/home/site/wwwroot/antenv" ]; then
    echo "🔧 Activating App Service virtual environment..."
    source /home/site/wwwroot/antenv/bin/activate
elif [ -d ".venv/bin" ]; then
    echo "🔧 Activating local virtual environment..."
    source .venv/bin/activate
fi

# 2. Python version check
echo "🐍 Python: $(python --version)"
echo "📦 PIP: $(pip --version)"

echo "🔑 PATH: $PATH"
echo "🌐 PORT: ${PORT:-8000}"
echo "🗄️ DATABASE_URL: ${DATABASE_URL:-<not set>}"

# 3. Requirements check
if [ -f "requirements.txt" ]; then
    echo "📦 Checking dependencies..."
    
    # Faqat kerakli paketlarni tekshirish
    for pkg in fastapi uvicorn gunicorn; do
        if ! python -c "import $pkg" 2>/dev/null; then
            echo "⚠️ $pkg not found. Installing requirements..."
            pip install --no-cache-dir -r requirements.txt
            break
        fi
    done
    echo "✅ Dependencies OK"
fi

# 4. Database migrations (optional)
if [ -f "alembic.ini" ] && [ -d "alembic" ]; then
    echo "💾 Running migrations..."
    python -m alembic upgrade head || echo "⚠️ Migration skipped"
fi

# 5. Start the server
PORT="${PORT:-8000}"
WORKERS="${WORKERS:-2}"
TIMEOUT="${TIMEOUT:-300}"

echo "🔥 Starting server on port $PORT..."
echo "👷 Workers: $WORKERS"
echo "⏱️ Timeout: $TIMEOUT seconds"

# To'g'ri startup command:
# Variant A: Faqat uvicorn (oddiy)
# exec uvicorn main:app --host 0.0.0.0 --port $PORT --workers $WORKERS

# Variant B: Gunicorn + UvicornWorker (tavsiya etilgan)
exec env PYTHONUNBUFFERED=1 gunicorn \
    -w $WORKERS \
    -k uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:$PORT" \
    --timeout $TIMEOUT \
    --access-logfile - \
    --error-logfile - \
    --log-level debug \
    main:app || {
    echo "⚠️ Gunicorn failed to start; running uvicorn directly for diagnostics..."
    exec python -u -m uvicorn main:app --host 0.0.0.0 --port $PORT --log-level debug
}