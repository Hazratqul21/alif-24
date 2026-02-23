#!/bin/bash
export DATABASE_URL="postgresql+asyncpg://postgres:pass@localhost:5432/db"
export JWT_SECRET="val"
export JWT_REFRESH_SECRET="val"
export SECRET_KEY="val"
export OPENAI_API_KEY="val"
export TELEGRAM_BOT_TOKEN="val"
export REDIS_URL="redis://localhost:6379"
export AZURE_SPEECH_KEY="val"
export AZURE_SPEECH_REGION="val"
export AZURE_OPENAI_KEY="val"
export AZURE_OPENAI_ENDPOINT="https://val.com"
export PYTHONPATH="$(pwd)"

for b in MainPlatform Harf TestAI CRM Games Olimp Lessions; do
  echo "====================================="
  echo "Testing $b Backend"
  if [ -d "$b/backend" ]; then
    cd "$b/backend"
    python3 -c "import main" 2>&1
    if [ $? -eq 0 ]; then
      echo "✅ $b Backend OK"
    else
      echo "❌ $b Backend FAILED"
    fi
    cd ../..
  else
    echo "❌ Directory $b/backend not found"
  fi
done
