#!/bin/bash
# ============================================
# Alif24 Platform Diagnostika Skripti
# Serverda ishga tushiring: bash diagnose.sh
# ============================================

echo "========================================"
echo "  ALIF24 DIAGNOSTIKA — $(date)"
echo "========================================"

echo ""
echo "=== 1. DOCKER CONTAINERS HOLATI ==="
docker compose ps -a 2>/dev/null || docker-compose ps -a 2>/dev/null
echo ""

echo "=== 2. CRASH / RESTART BO'LGAN CONTAINERLAR ==="
docker compose ps -a 2>/dev/null | grep -E "Exit|Restarting|unhealthy" || echo "  Hammasi yaxshi — crash yo'q"
echo ""

echo "=== 3. BACKEND HEALTH CHECKS ==="
echo -n "  main-backend (8000):    "
curl -s --max-time 5 http://localhost:8000/health 2>/dev/null || curl -s --max-time 5 http://localhost:8000/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  harf-backend (8001):    "
curl -s --max-time 5 http://localhost:8001/health 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  testai-backend (8002):  "
curl -s --max-time 5 http://localhost:8002/health 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  crm-backend (8003):     "
curl -s --max-time 5 http://localhost:8003/health 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  games-backend (8004):   "
curl -s --max-time 5 http://localhost:8004/health 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  olimp-backend (8005):   "
curl -s --max-time 5 http://localhost:8005/health 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  lessions-backend (8006):"
curl -s --max-time 5 http://localhost:8006/health 2>/dev/null || echo "UNREACHABLE"
echo ""

echo ""
echo "=== 4. FRONTEND CHECKS ==="
echo -n "  main-frontend (5173):    "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  harf-frontend (5174):    "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5174/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  testai-frontend (5175):  "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5175/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  crm-frontend (5176):     "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5176/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  games-frontend (5177):   "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5177/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  olimp-frontend (5178):   "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5178/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  lessions-frontend (5179):"
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:5179/ 2>/dev/null || echo "UNREACHABLE"
echo ""

echo ""
echo "=== 5. NGINX GATEWAY ==="
echo -n "  nginx (80):  "
curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "UNREACHABLE"
echo ""
echo -n "  nginx (443): "
curl -sk --max-time 5 -o /dev/null -w "%{http_code}" https://localhost/ 2>/dev/null || echo "UNREACHABLE"
echo ""

echo ""
echo "=== 6. DATABASE ==="
echo -n "  postgres (5432): "
docker exec postgres pg_isready 2>/dev/null || echo "UNREACHABLE"
echo ""

echo ""
echo "=== 7. XATO LOGLAR (oxirgi 15 qator) ==="
for svc in main-backend olimp-backend harf-backend testai-backend crm-backend games-backend lessions-backend; do
    ERRS=$(docker compose logs --tail=15 $svc 2>/dev/null | grep -iE "error|traceback|exception|failed|import" | head -5)
    if [ -n "$ERRS" ]; then
        echo ""
        echo "  --- $svc XATOLIKLAR ---"
        echo "$ERRS"
    fi
done

echo ""
echo "=== 8. DISK VA MEMORY ==="
echo "  Disk:"
df -h / | tail -1
echo "  Memory:"
free -h 2>/dev/null | head -2 || vm_stat 2>/dev/null | head -5
echo ""

echo "=== 9. UPLOADS PAPKA ==="
if [ -d /data/uploads ]; then
    echo "  /data/uploads mavjud — $(ls /data/uploads 2>/dev/null | wc -l) fayl"
else
    echo "  /data/uploads YO'Q — mkdir -p /data/uploads kerak!"
fi
echo ""

echo "========================================"
echo "  DIAGNOSTIKA TUGADI"
echo "========================================"
