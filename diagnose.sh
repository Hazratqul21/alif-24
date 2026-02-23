#!/bin/bash
# ================================================================
#  ALIF24 PLATFORM — Professional Monitoring & Diagnostika Tool
#  Version: 3.0
#  Ishlatish:
#    bash diagnose.sh              — To'liq diagnostika
#    bash diagnose.sh heal         — O'z-o'zini davolash (Auto-fix)
#    bash diagnose.sh status       — Faqat containerlar holati
#    bash diagnose.sh health       — Faqat health check
#    bash diagnose.sh logs [service] [N] — Loglar (default: hammasi, 30 qator)
#    bash diagnose.sh errors [N]   — Faqat xatoliklar (oxirgi N qator)
#    bash diagnose.sh requests [N] — Nginx request loglar (oxirgi N)
#    bash diagnose.sh db           — Database holati va statistika
#    bash diagnose.sh perf         — Performance (CPU, RAM, disk)
#    bash diagnose.sh api [endpoint] — API endpoint test
#    bash diagnose.sh restart [service] — Service qayta ishga tushirish
#    bash diagnose.sh rebuild [service] — Service qayta build + restart
#    bash diagnose.sh follow [service]  — Real-time log kuzatish (Ctrl+C to stop)
# ================================================================

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Compose command
DC="docker compose"
$DC version &>/dev/null || DC="docker-compose"

# Servicelar ro'yxati
BACKENDS=(main-backend harf-backend testai-backend crm-backend games-backend olimp-backend lessions-backend)
FRONTENDS=(main-frontend harf-frontend testai-frontend crm-frontend games-frontend olimp-frontend lessions-frontend)
BACKEND_PORTS=(8000 8001 8002 8003 8004 8005 8006)
FRONTEND_PORTS=(5173 5174 5175 5176 5177 5178 5179)
SERVICE_NAMES=("MainPlatform" "Harf" "TestAI" "CRM" "Games" "Olimp" "Lessions")

# ================================================================
# UTILITY FUNCTIONS
# ================================================================

header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; }
info() { echo -e "  ${DIM}$1${NC}"; }

check_health() {
    local name=$1 port=$2 label=$3
    local response
    response=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}|%{time_total}" http://localhost:$port/health 2>/dev/null)
    local code=$(echo $response | cut -d'|' -f1)
    local time=$(echo $response | cut -d'|' -f2)

    if [ "$code" = "000" ]; then
        # Try root endpoint
        response=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}|%{time_total}" http://localhost:$port/ 2>/dev/null)
        code=$(echo $response | cut -d'|' -f1)
        time=$(echo $response | cut -d'|' -f2)
    fi

    if [ "$code" = "200" ]; then
        ok "$label ($port) — ${time}s"
    elif [ "$code" = "000" ]; then
        fail "$label ($port) — UNREACHABLE"
    else
        warn "$label ($port) — HTTP $code (${time}s)"
    fi
}

# ================================================================
# 1. STATUS — Containerlar holati
# ================================================================
cmd_status() {
    header "DOCKER CONTAINERS"
    echo ""

    local total=0 running=0 stopped=0 unhealthy=0

    while IFS= read -r line; do
        total=$((total + 1))
        local name=$(echo "$line" | awk '{print $1}')
        local status=$(echo "$line" | awk '{for(i=1;i<=NF;i++) if($i ~ /Up|Exited|Restarting/) {for(j=i;j<=NF;j++) printf "%s ", $j; break}}')

        if echo "$status" | grep -q "Up"; then
            if echo "$status" | grep -q "unhealthy"; then
                unhealthy=$((unhealthy + 1))
                warn "$name — $status"
            else
                running=$((running + 1))
                ok "$name — $status"
            fi
        else
            stopped=$((stopped + 1))
            fail "$name — $status"
        fi
    done < <($DC ps -a --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | tail -n +2)

    echo ""
    echo -e "  ${BOLD}Jami: $total | ${GREEN}Running: $running${NC} | ${YELLOW}Unhealthy: $unhealthy${NC} | ${RED}Stopped: $stopped${NC}"
}

# ================================================================
# SECURITY — Tarmoq xavfsizligi
# ================================================================
cmd_security() {
    header "XAVFSIZLIK AUDITI (Ochiq Portlar)"
    echo ""
    local ports_to_check=("5432" "6379" "5050")
    local found_vuln=0

    for port in "${ports_to_check[@]}"; do
        # Docker default ports
        if docker ps --format '{{.Ports}}' | grep "0.0.0.0:$port->" &>/dev/null; then
            fail "DIQQAT! Port $port (Potensial Maxfiy xizmat) Butun dunyoga 0.0.0.0 orqali ochiq!"
            found_vuln=$((found_vuln + 1))
        fi
    done

    if [ $found_vuln -eq 0 ]; then
        ok "Ochiq qolgan (0.0.0.0) maxfiy portlar yo'q. Hamma narsa yopiq!"
    fi
}

# ================================================================
# 2. HEALTH — Backend + Frontend health
# ================================================================
cmd_health() {
    header "BACKEND HEALTH CHECKS"
    for i in "${!BACKENDS[@]}"; do
        check_health "${BACKENDS[$i]}" "${BACKEND_PORTS[$i]}" "${SERVICE_NAMES[$i]} Backend"
    done

    header "FRONTEND CHECKS"
    for i in "${!FRONTENDS[@]}"; do
        local port=${FRONTEND_PORTS[$i]}
        local code=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost:$port/ 2>/dev/null)
        if [ "$code" = "200" ]; then
            ok "${SERVICE_NAMES[$i]} Frontend ($port) — HTTP $code"
        elif [ "$code" = "000" ]; then
            fail "${SERVICE_NAMES[$i]} Frontend ($port) — UNREACHABLE"
        else
            warn "${SERVICE_NAMES[$i]} Frontend ($port) — HTTP $code"
        fi
    done

    header "NGINX GATEWAY"
    local http=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
    local https=$(curl -sk --max-time 3 -o /dev/null -w "%{http_code}" https://localhost/ 2>/dev/null)
    [ "$http" = "200" ] || [ "$http" = "301" ] && ok "HTTP  (:80)  — $http" || fail "HTTP  (:80)  — $http"
    [ "$https" = "200" ] && ok "HTTPS (:443) — $https" || warn "HTTPS (:443) — $https"

    header "DATABASE & CACHE"
    docker exec alif24-postgres pg_isready -U postgres &>/dev/null && ok "PostgreSQL — healthy" || fail "PostgreSQL — UNREACHABLE"
    docker exec alif24-redis redis-cli ping &>/dev/null && ok "Redis — healthy" || fail "Redis — UNREACHABLE"
}

# ================================================================
# 3. LOGS — Service loglarini ko'rish
# ================================================================
cmd_logs() {
    local service="${1:-all}"
    local lines="${2:-30}"

    if [ "$service" = "all" ]; then
        for svc in "${BACKENDS[@]}"; do
            header "$svc LOGLAR (oxirgi $lines)"
            $DC logs --tail=$lines --no-log-prefix $svc 2>/dev/null | tail -$lines
        done
    else
        header "$service LOGLAR (oxirgi $lines)"
        $DC logs --tail=$lines --no-log-prefix $service 2>/dev/null
    fi
}

# ================================================================
# 4. ERRORS — Faqat xatoliklar
# ================================================================
cmd_errors() {
    local lines="${1:-50}"
    header "XATOLIKLAR — barcha backendlardan (oxirgi $lines)"

    local found=0
    for svc in "${BACKENDS[@]}"; do
        local errs=$($DC logs --tail=$lines $svc 2>/dev/null | grep -iE "error|traceback|exception|failed|critical|fatal" | grep -viE "healthcheck|no error" | tail -10)
        if [ -n "$errs" ]; then
            found=$((found + 1))
            echo ""
            echo -e "  ${RED}━━━ $svc ━━━${NC}"
            echo "$errs" | while IFS= read -r line; do
                echo -e "  ${DIM}$line${NC}"
            done
        fi
    done

    # Nginx errors
    local nginx_errs=$($DC logs --tail=$lines nginx 2>/dev/null | grep -iE "error|failed|502|503|504" | grep -v "healthcheck" | tail -10)
    if [ -n "$nginx_errs" ]; then
        found=$((found + 1))
        echo ""
        echo -e "  ${RED}━━━ nginx ━━━${NC}"
        echo "$nginx_errs" | while IFS= read -r line; do
            echo -e "  ${DIM}$line${NC}"
        done
    fi

    # Postgres errors
    local pg_errs=$($DC logs --tail=$lines postgres 2>/dev/null | grep -iE "FATAL|ERROR|PANIC" | tail -5)
    if [ -n "$pg_errs" ]; then
        found=$((found + 1))
        echo ""
        echo -e "  ${RED}━━━ postgres ━━━${NC}"
        echo "$pg_errs" | while IFS= read -r line; do
            echo -e "  ${DIM}$line${NC}"
        done
    fi

    # OOM Killer tekshiruvi (Maxfiy xatoliklar)
    echo ""
    header "OOM KILLER (Out of Memory) XATOLARI"
    local oom_errs=$(dmesg -T 2>/dev/null | grep -iE "oom-killer|out of memory" | tail -n 5)
    if [ -n "$oom_errs" ]; then
        found=$((found + 1))
        echo -e "  ${RED}━━━ DIQQAT: RAM YETISHMOVCHILIGI (OOM) ━━━${NC}"
        echo "$oom_errs" | while IFS= read -r line; do
            echo -e "  ${YELLOW}$line${NC}"
        done
        warn "Qandaydir process xotira kattaligidan o'ldirilgan. 'dmesg' ni tekshiring."
        echo ""
    fi

    if [ $found -eq 0 ]; then
        echo ""
        ok "Hech qanday xatolik topilmadi!"
    fi
}

# ================================================================
# 5. REQUESTS — Nginx request loglar
# ================================================================
cmd_requests() {
    local lines="${1:-50}"
    header "NGINX SO'ROVLAR (oxirgi $lines)"
    echo ""

    echo -e "  ${BOLD}Oxirgi API so'rovlar:${NC}"
    $DC logs --tail=$lines --no-log-prefix nginx 2>/dev/null | grep -E "\"(GET|POST|PUT|DELETE|PATCH)" | grep "/api/" | tail -$lines | while IFS= read -r line; do
        local method=$(echo "$line" | grep -oE '"(GET|POST|PUT|DELETE|PATCH)' | tr -d '"')
        local path=$(echo "$line" | grep -oE '"(GET|POST|PUT|DELETE|PATCH) [^ ]+' | awk '{print $2}')
        local status=$(echo "$line" | grep -oE '" [0-9]{3} ' | awk '{print $2}')
        local ip=$(echo "$line" | awk '{print $1}')

        local color=$GREEN
        [ "$status" -ge 400 ] 2>/dev/null && color=$YELLOW
        [ "$status" -ge 500 ] 2>/dev/null && color=$RED
        [ "$status" = "404" ] && color=$RED
        [ "$status" = "429" ] && color=$RED # Too Many Requests

        printf "  ${DIM}%-15s${NC} %-6s ${color}%s${NC} %s\n" "$ip" "$method" "$status" "$path"
    done

    echo ""
    echo -e "  ${BOLD}HTTP Status statistikasi:${NC}"
    $DC logs --tail=500 --no-log-prefix nginx 2>/dev/null | grep -oE '" [0-9]{3} ' | sort | uniq -c | sort -rn | head -10 | while read count code; do
        local color=$GREEN
        code=$(echo $code | tr -d ' "')
        [ "$code" -ge 400 ] 2>/dev/null && color=$YELLOW
        [ "$code" -ge 500 ] 2>/dev/null && color=$RED
        printf "    ${color}HTTP %-4s${NC} — %s marta\n" "$code" "$count"
    done

    echo ""
    echo -e "  ${BOLD}Eng ko'p so'rov yuborilgan endpointlar:${NC}"
    $DC logs --tail=500 --no-log-prefix nginx 2>/dev/null | grep -oE '"(GET|POST|PUT|DELETE) /[^ ]+' | awk '{print $2}' | sort | uniq -c | sort -rn | head -15 | while read count path; do
        printf "    %-6s %s\n" "$count" "$path"
    done

    echo ""
    echo -e "  ${BOLD}Eng faol IP manzillar:${NC}"
    $DC logs --tail=500 --no-log-prefix nginx 2>/dev/null | awk '{print $1}' | grep -E "^[0-9]" | sort | uniq -c | sort -rn | head -10 | while read count ip; do
        printf "    %-6s %s\n" "$count" "$ip"
    done

    echo ""
    echo -e "  ${BOLD}SEKIN API SO'ROVLAR (Deep Profiling):${NC}"
    # Nginx default access logda vaqt bo'lmasligi mumkin shuning uchun HTTP kod va path orqali eng og'ir payloadlarni aniqlaymiz.
    $DC logs --tail=500 --no-log-prefix nginx 2>/dev/null | grep -E "\" 504 |\" 502" | tail -5 | while IFS= read -r line; do
        warn "Sekin (Timeout/Bad Gateway) So'rov: ${line:0:100}"
    done
}

# ================================================================
# 6. DB — Database holati
# ================================================================
cmd_db() {
    header "DATABASE HOLATI"
    echo ""

    # Connection check
    docker exec alif24-postgres pg_isready -U postgres &>/dev/null && ok "PostgreSQL — connected" || fail "PostgreSQL — UNREACHABLE"

    # DB size
    echo ""
    echo -e "  ${BOLD}Database hajmi:${NC}"
    docker exec alif24-postgres psql -U postgres -d alif24 -t -c "SELECT pg_size_pretty(pg_database_size('alif24'));" 2>/dev/null | head -1 | while read size; do
        info "  alif24 database: $size"
    done

    # Table counts
    echo ""
    echo -e "  ${BOLD}Jadvallar va ularning REAK disk hajmlari:${NC}"
    docker exec alif24-postgres psql -U postgres -d alif24 -t -c "
        SELECT schemaname||'.'||relname AS table, n_live_tup AS rows, pg_size_pretty(pg_total_relation_size(relid)) AS size
        FROM pg_stat_user_tables
        WHERE n_live_tup > 0
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 10;
    " 2>/dev/null | while IFS='|' read table rows size; do
        table=$(echo $table | xargs)
        rows=$(echo $rows | xargs)
        size=$(echo $size | xargs)
        [ -n "$table" ] && printf "    %-35s %-10s %s yozuv\n" "$table" "$size" "$rows"
    done

    # Active connections
    echo ""
    echo -e "  ${BOLD}Faol ulanishlar:${NC}"
    docker exec alif24-postgres psql -U postgres -d alif24 -t -c "
        SELECT count(*) AS total,
               count(*) FILTER (WHERE state = 'active') AS active,
               count(*) FILTER (WHERE state = 'idle') AS idle
        FROM pg_stat_activity
        WHERE datname = 'alif24';
    " 2>/dev/null | while IFS='|' read total active idle; do
        info "  Jami: $(echo $total | xargs) | Active: $(echo $active | xargs) | Idle: $(echo $idle | xargs)"
    done

    # Idle in Transaction so'rovlarini alohida tekshirish uzoq kutib turganlarini
    local idle_tx=$(docker exec alif24-postgres psql -U postgres -d alif24 -t -c "
        SELECT count(*) 
        FROM pg_stat_activity 
        WHERE state = 'idle in transaction' AND (now() - state_change) > interval '1 minute';
    " 2>/dev/null | xargs)
    if [ "$idle_tx" != "0" ] && [ -n "$idle_tx" ]; then
        fail "DIQQAT: Bazada $idle_tx ta 'idle in transaction' ulanishi 1 daqiqadan beri qotib qolgan!"
    fi

    # Slow queries
    echo ""
    echo -e "  ${BOLD}Sekin so'rovlar (5s+):${NC}"
    local slow=$(docker exec alif24-postgres psql -U postgres -d alif24 -t -c "
        SELECT pid, now() - pg_stat_activity.query_start AS duration, query
        FROM pg_stat_activity
        WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
        AND state = 'active'
        AND query NOT ILIKE '%pg_stat%';
    " 2>/dev/null | head -5)
    if [ -n "$(echo $slow | xargs)" ]; then
        warn "Sekin so'rovlar topildi:"
        echo "$slow"
    else
        ok "Sekin so'rovlar yo'q"
    fi

    # Redis
    header "REDIS HOLATI"
    docker exec alif24-redis redis-cli ping &>/dev/null && ok "Redis — PONG" || fail "Redis — UNREACHABLE"
    local redis_info=$(docker exec alif24-redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    [ -n "$redis_info" ] && info "  Xotira: $redis_info"
    
    local redis_frag=$(docker exec alif24-redis redis-cli info memory 2>/dev/null | grep "mem_fragmentation_ratio" | cut -d: -f2 | tr -d '\r')
    if [ -n "$redis_frag" ]; then
        if (( $(echo "$redis_frag > 1.5" | bc -l 2>/dev/null || echo 0) )); then
            fail "  Fragmentatsiya: $redis_frag (XAVFLI: redisni restart qiling)"
        else
            info "  Fragmentatsiya: $redis_frag"
        fi
    fi

    local redis_keys=$(docker exec alif24-redis redis-cli dbsize 2>/dev/null | awk '{print $2}')
    [ -n "$redis_keys" ] && info "  Kalitlar soni: $redis_keys"
}

# ================================================================
# 7. PERF — Performance
# ================================================================
cmd_perf() {
    header "SERVER PERFORMANCE"

    echo ""
    echo -e "  ${BOLD}System:${NC}"
    info "  Hostname: $(hostname)"
    info "  Uptime: $(uptime -p 2>/dev/null || uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')"
    info "  Load Average: $(cat /proc/loadavg 2>/dev/null | awk '{print $1, $2, $3}' || uptime | awk -F'load average:' '{print $2}')"

    echo ""
    echo -e "  ${BOLD}CPU:${NC}"
    local cores=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "?")
    info "  CPU Cores: $cores"

    echo ""
    echo -e "  ${BOLD}Memory:${NC}"
    if command -v free &>/dev/null; then
        free -h | head -2 | while IFS= read -r line; do
            info "  $line"
        done
        local mem_pct=$(free | awk '/Mem:/ {printf "%.1f", $3/$2*100}')
        if (( $(echo "$mem_pct > 90" | bc -l 2>/dev/null || echo 0) )); then
            fail "Memory ishlatilishi: ${mem_pct}% — KRITIK YUQORI!"
        elif (( $(echo "$mem_pct > 75" | bc -l 2>/dev/null || echo 0) )); then
            warn "Memory ishlatilishi: ${mem_pct}%"
        else
            ok "Memory ishlatilishi: ${mem_pct}%"
        fi
    fi

    echo ""
    echo -e "  ${BOLD}Disk:${NC}"
    df -h / | tail -1 | while read fs size used avail pct mount; do
        info "  $fs — Jami: $size | Ishlatilgan: $used ($pct) | Bo'sh: $avail"
        local pct_num=$(echo $pct | tr -d '%')
        if [ "$pct_num" -gt 90 ] 2>/dev/null; then
            fail "Disk: $pct ishlatilgan — KRITIK!"
        elif [ "$pct_num" -gt 75 ] 2>/dev/null; then
            warn "Disk: $pct ishlatilgan"
        else
            ok "Disk: $pct ishlatilgan"
        fi
    done

    echo ""
    echo -e "  ${BOLD}Inodes (Mayda Fayllar Limitlari):${NC}"
    df -i / | tail -1 | while read fs inodes iused ifree ipct mount; do
        info "  $fs — Jami Inodes: $inodes | Ishlatilgan: $iused ($ipct)"
        local ipct_num=$(echo $ipct | tr -d '%')
        if [ "$ipct_num" -gt 85 ] 2>/dev/null; then
            fail "Inodes: $ipct ishlatilgan — 500 ERROR KELIB CHIQISHI MUMKIN!"
        fi
    done

    echo ""
    echo -e "  ${BOLD}Docker resurslar:${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null | head -20

    echo ""
    echo -e "  ${BOLD}Uploads papka:${NC}"
    if [ -d /data/uploads ]; then
        local count=$(find /data/uploads -type f 2>/dev/null | wc -l)
        local size=$(du -sh /data/uploads 2>/dev/null | awk '{print $1}')
        ok "/data/uploads — $count fayl, $size hajm"
    else
        fail "/data/uploads YO'Q — mkdir -p /data/uploads kerak!"
    fi

    echo ""
    echo -e "  ${BOLD}Docker images hajmi:${NC}"
    docker system df 2>/dev/null | head -5
    
    local build_cache=$(docker system df --format "{{.Reclaimable}}" 2>/dev/null | tail -1)
    if [[ "$build_cache" == *"GB"* ]]; then
        local cache_num=$(echo $build_cache | grep -o '^[0-9.]*')
        if (( $(echo "$cache_num > 2" | bc -l 2>/dev/null || echo 0) )); then
            echo ""
            fail "DIQQAT: Zombi Docker/Build Cache hajmi juda katta ($build_cache)!"
            info "Xotirani tozalash uchun 'bash diagnose.sh heal' komandasini ishlating."
        fi
    fi
}

# ================================================================
# 8. API — Endpoint test
# ================================================================
cmd_api() {
    local endpoint="${1:-/api/v1/health/ping}"
    local port="${2:-8000}"
    header "API TEST — http://localhost:$port$endpoint"
    echo ""

    local start=$(date +%s%N)
    local response=$(curl -s --max-time 10 -w "\n---HTTP_CODE:%{http_code}---TIME:%{time_total}---SIZE:%{size_download}" http://localhost:$port$endpoint 2>/dev/null)
    local body=$(echo "$response" | sed '/^---HTTP_CODE/d')
    local code=$(echo "$response" | grep -oE 'HTTP_CODE:[0-9]+' | cut -d: -f2)
    local time=$(echo "$response" | grep -oE 'TIME:[0-9.]+' | cut -d: -f2)
    local size=$(echo "$response" | grep -oE 'SIZE:[0-9]+' | cut -d: -f2)

    echo -e "  ${BOLD}Status:${NC} $code"
    echo -e "  ${BOLD}Vaqt:${NC}   ${time}s"
    echo -e "  ${BOLD}Hajm:${NC}   ${size} bytes"
    echo -e "  ${BOLD}Javob:${NC}"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
}

# ================================================================
# 9. RESTART — Service restart
# ================================================================
cmd_restart() {
    local service="$1"
    if [ -z "$service" ]; then
        echo -e "${RED}Xatolik: Service nomini kiriting${NC}"
        echo "  Masalan: bash diagnose.sh restart olimp-backend"
        return 1
    fi
    header "RESTART: $service"
    $DC restart $service
    sleep 2
    $DC ps $service
}

# ================================================================
# 10. REBUILD — Service rebuild + restart
# ================================================================
cmd_rebuild() {
    local service="$1"
    if [ -z "$service" ]; then
        echo -e "${RED}Xatolik: Service nomini kiriting${NC}"
        echo "  Masalan: bash diagnose.sh rebuild olimp-backend"
        return 1
    fi
    header "REBUILD: $service"
    echo -e "  ${YELLOW}Building...${NC}"
    $DC build --no-cache $service
    echo -e "  ${YELLOW}Restarting...${NC}"
    $DC up -d --no-deps $service
    sleep 3
    $DC ps $service
    echo ""
    $DC logs --tail=10 $service
}

# ================================================================
# 11. FOLLOW — Real-time loglar
# ================================================================
cmd_follow() {
    local service="${1:-nginx}"
    header "REAL-TIME LOG: $service (Ctrl+C to stop)"
    $DC logs -f --tail=20 $service
}

# ================================================================
# 12. HEAL — Auto-fix va tozalash
# ================================================================
cmd_heal() {
    header "AUTO-FIX (O'z-o'zini davolash) BOSHLANDI..."
    echo ""
    
    echo -e "  ${YELLOW}1. Docker keraksiz (exited/dangling) xotirasini tozalash...${NC}"
    docker system prune -f 
    ok "Docker Tozalandi!"

    echo -e "  ${YELLOW}2. Bazadagi osilgan (idle) ulanishlarni uzish...${NC}"
    docker exec alif24-postgres psql -U postgres -d alif24 -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE state = 'idle in transaction' AND (now() - state_change) > interval '2 minute';
    " 2>/dev/null
    ok "Birlamchi osilgan tranzaksiyalar uzib yuborildi."

    echo ""
    ok "Davolash yakunlandi! Holatni ko'rish uchun 'bash diagnose.sh' ishlating."
}

# ================================================================
# FULL DIAGNOSTIKA
# ================================================================
cmd_full() {
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║        ALIF24 PLATFORM — TO'LIQ DIAGNOSTIKA            ║${NC}"
    echo -e "${BOLD}${CYAN}║        $(date '+%Y-%m-%d %H:%M:%S %Z')                       ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

    cmd_status
    cmd_security
    cmd_health

    # SSL Sertifikat tekshiruvi
    header "SSL SERTIFIKAT HOLATI"
    local ssl_info=$(curl -skIv https://alif24.uz 2>&1 | grep "expire date")
    if [ -n "$ssl_info" ]; then
        ok "SSL: $ssl_info"
    else
        warn "SSL tekshirib bo'lmadi yoki mavjud emas"
    fi

    cmd_errors 30
    cmd_perf

    header "TEZKOR BUYRUQLAR ESLATMA"
    echo ""
    echo -e "  ${BOLD}bash diagnose.sh status${NC}          — Container holatlari"
    echo -e "  ${BOLD}bash diagnose.sh health${NC}          — Health check"
    echo -e "  ${BOLD}bash diagnose.sh logs main-backend 50${NC}  — Oxirgi 50 log"
    echo -e "  ${BOLD}bash diagnose.sh errors 100${NC}      — Oxirgi 100 xatolik"
    echo -e "  ${BOLD}bash diagnose.sh requests 50${NC}     — So'rovlar"
    echo -e "  ${BOLD}bash diagnose.sh db${NC}              — Database holati"
    echo -e "  ${BOLD}bash diagnose.sh perf${NC}            — Performance"
    echo -e "  ${BOLD}bash diagnose.sh api /api/v1/auth/me${NC}  — API test"
    echo -e "  ${BOLD}bash diagnose.sh heal${NC}            — Auto-fix (Tozalash)"
    echo -e "  ${BOLD}bash diagnose.sh follow nginx${NC}    — Real-time log"
    echo -e "  ${BOLD}bash diagnose.sh rebuild olimp-backend${NC} — Qayta build"
    echo ""
}

# ================================================================
# MAIN — Command router
# ================================================================
case "${1:-full}" in
    status)   cmd_status ;;
    health)   cmd_health ;;
    logs)     cmd_logs "$2" "$3" ;;
    errors)   cmd_errors "$2" ;;
    requests) cmd_requests "$2" ;;
    db)       cmd_db ;;
    perf)     cmd_perf ;;
    api)      cmd_api "$2" "$3" ;;
    heal)     cmd_heal ;;
    restart)  cmd_restart "$2" ;;
    rebuild)  cmd_rebuild "$2" ;;
    follow)   cmd_follow "$2" ;;
    full)     cmd_full ;;
    help|--help|-h)
        echo "Alif24 Diagnostika Tool v2.0"
        echo ""
        echo "Ishlatish: bash diagnose.sh [command] [args]"
        echo ""
        echo "Commands:"
        echo "  (bo'sh)     To'liq diagnostika"
        echo "  status      Container holatlari"
        echo "  health      Backend/Frontend health check"
        echo "  logs [svc] [N]  Loglar (default: all, 30)"
        echo "  errors [N]  Faqat xatoliklar"
        echo "  requests [N] Nginx so'rovlar"
        echo "  db          Database holati + statistika"
        echo "  perf        CPU, RAM, Disk, Docker stats"
        echo "  api [path] [port]  API test"
        echo "  heal        Auto-fix va server xotirasini tozalash"
        echo "  restart [svc]  Service restart"
        echo "  rebuild [svc]  Build + restart"
        echo "  follow [svc]   Real-time log (Ctrl+C)"
        echo "  help        Shu yordam"
        ;;
    *)
        echo -e "${RED}Noma'lum buyruq: $1${NC}"
        echo "bash diagnose.sh help — yordam"
        ;;
esac
