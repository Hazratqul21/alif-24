#!/bin/bash
# ============================================================
# Alif24 - Aqlli Deploy Skripti
# Faqat o'zgargan servislarni qayta ishga tushiradi
# Boshqa servislar ISHLASHDA DAVOM ETADI (zero-downtime)
# ============================================================

set -e

COMPOSE_FILE="docker-compose.yml"
PROJECT_DIR="/opt/alif24"
BACKUP_DIR="/data/backups"

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║   🚀 Alif24 Deploy Skripti          ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

cd "$PROJECT_DIR" || { echo -e "${RED}❌ $PROJECT_DIR topilmadi${NC}"; exit 1; }

# 1. Git dan yangilanishlarni olish
echo -e "${YELLOW}📥 Git pull...${NC}"
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo -e "${YELLOW}⚠️ Git pull amalga oshmadi${NC}"

# 2. O'zgargan fayllarni aniqlash
echo -e "${YELLOW}🔍 O'zgargan servislarni aniqlash...${NC}"

CHANGED_SERVICES=""

# So'nggi commit dagi o'zgarishlarni tekshirish
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}⚠️ O'zgarishlar aniqlanmadi. Barcha servislarni yangilaysizmi? (y/n)${NC}"
    read -r answer
    if [ "$answer" != "y" ]; then
        echo "Bekor qilindi."
        exit 0
    fi
    CHANGED_SERVICES="all"
fi

if [ "$CHANGED_SERVICES" != "all" ]; then
    # Qaysi servislar o'zgarganini tekshirish
    if echo "$CHANGED_FILES" | grep -q "MainPlatform/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES main-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "MainPlatform/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES main-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Harf/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES harf-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Harf/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES harf-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "TestAI/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES testai-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "TestAI/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES testai-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "CRM/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES crm-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "CRM/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES crm-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Games/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES games-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Games/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES games-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Olimp/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES olimp-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Olimp/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES olimp-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Lessions/backend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES lessions-backend"
    fi
    if echo "$CHANGED_FILES" | grep -q "Lessions/frontend"; then
        CHANGED_SERVICES="$CHANGED_SERVICES lessions-frontend"
    fi
    if echo "$CHANGED_FILES" | grep -q "shared/"; then
        # shared o'zgarganda HAMMA backendlarni yangilash kerak
        CHANGED_SERVICES="main-backend harf-backend testai-backend crm-backend games-backend olimp-backend lessions-backend"
        echo -e "${YELLOW}📦 shared/ o'zgardi — barcha backendlar yangilanadi${NC}"
    fi
    if echo "$CHANGED_FILES" | grep -q "docker-compose"; then
        CHANGED_SERVICES="all"
        echo -e "${YELLOW}📦 docker-compose o'zgardi — barcha servislar yangilanadi${NC}"
    fi
fi

# 3. DB backup (deploy dan oldin)
echo -e "${YELLOW}💾 Ma'lumotlar bazasi backup...${NC}"
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="alif24_$(date +%Y%m%d_%H%M%S).sql"
docker compose exec -T postgres pg_dump -U postgres alif24 > "$BACKUP_DIR/$BACKUP_NAME" 2>/dev/null && \
    echo -e "${GREEN}✅ Backup saqlandi: $BACKUP_DIR/$BACKUP_NAME${NC}" || \
    echo -e "${YELLOW}⚠️ Backup amalga oshmadi (postgres ishlamayotgan bo'lishi mumkin)${NC}"

# 4. Servislarni yangilash
if [ "$CHANGED_SERVICES" = "all" ]; then
    echo -e "${BLUE}🔄 Barcha servislar yangilanmoqda...${NC}"
    docker compose up -d --build
else
    echo -e "${BLUE}🔄 O'zgargan servislar yangilanmoqda: ${CHANGED_SERVICES}${NC}"
    # shellcheck disable=SC2086
    docker compose up -d --no-deps --build $CHANGED_SERVICES
fi

# 5. Health check
echo -e "${YELLOW}🏥 Health check...${NC}"
sleep 5

SERVICES_OK=true
for port in 8000 8001 8002 8003 8004 8005 8006; do
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Port $port — OK${NC}"
    else
        echo -e "${YELLOW}  ⚠️ Port $port — javob bermayapti${NC}"
    fi
done

# 6. Eski Docker imajlarni tozalash
echo -e "${YELLOW}🧹 Eski Docker imajlarni tozalash...${NC}"
docker image prune -f > /dev/null 2>&1

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Deploy muvaffaqiyatli!          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Status:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
