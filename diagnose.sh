#!/bin/bash
# ================================================================
#  ALIF24 PLATFORM — Professional Monitoring & Diagnostika Tool
#  Version: 4.0
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
#    bash diagnose.sh backup       — Database backup
#    bash diagnose.sh restore [file] — Database restore
#    bash diagnose.sh watch [N]    — Auto-refresh monitoring (har N sekundda)
#    bash diagnose.sh network      — Docker network diagnostika
#    bash diagnose.sh deploy       — Tezkor deploy (git pull + rebuild)
#    bash diagnose.sh report       — Diagnostikani faylga saqlash
#    bash diagnose.sh diff [N]     — Oxirgi git o'zgarishlar
#    bash diagnose.sh score        — Umumiy sog'liq bali (0-100)
#    bash diagnose.sh top          — Eng ko'p resurs ishlatayotgan konteynerlar
#    bash diagnose.sh ssl          — SSL sertifikat tekshiruvi
# ================================================================

VERSION="4.0"

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
BOLD='\033[1m'
DIM='\033[2m'
UNDERLINE='\033[4m'
BLINK='\033[5m'
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
DOMAIN="alif24.uz"
BACKUP_DIR="/root/backups"
REPORT_DIR="/root/reports"

# Global health score counter
SCORE_TOTAL=0
SCORE_PASS=0

# ================================================================
# UTILITY FUNCTIONS
# ================================================================

header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

ok()   { echo -e "  ${GREEN}✅ $1${NC}"; SCORE_PASS=$((SCORE_PASS + 1)); SCORE_TOTAL=$((SCORE_TOTAL + 1)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; SCORE_TOTAL=$((SCORE_TOTAL + 1)); }
fail() { echo -e "  ${RED}❌ $1${NC}"; SCORE_TOTAL=$((SCORE_TOTAL + 1)); }
info() { echo -e "  ${DIM}$1${NC}"; }

# Progress bar [████████░░] 80%
progress_bar() {
    local pct=$1 width=30
    local filled=$((pct * width / 100))
    local empty=$((width - filled))
    local color=$GREEN
    [ "$pct" -gt 75 ] 2>/dev/null && color=$YELLOW
    [ "$pct" -gt 90 ] 2>/dev/null && color=$RED
    printf "  ${color}["
    printf '%0.s█' $(seq 1 $filled 2>/dev/null)
    printf '%0.s░' $(seq 1 $empty 2>/dev/null)
    printf "] %d%%${NC}\n" "$pct"
}

# Vaqtni odam o'qiydigan formatga o'tkazish
human_duration() {
    local seconds=$1
    if [ "$seconds" -ge 86400 ] 2>/dev/null; then
        echo "$((seconds / 86400))k $((seconds % 86400 / 3600))s"
    elif [ "$seconds" -ge 3600 ] 2>/dev/null; then
        echo "$((seconds / 3600))s $((seconds % 3600 / 60))d"
    elif [ "$seconds" -ge 60 ] 2>/dev/null; then
        echo "$((seconds / 60))d $((seconds % 60))s"
    else
        echo "${seconds}s"
    fi
}

# Separator line
separator() {
    echo -e "  ${DIM}──────────────────────────────────────────────${NC}"
}

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

    local total=0 running=0 stopped=0 unhealthy=0 restarting=0

    # Table header
    printf "  ${BOLD}%-25s %-12s %-8s %s${NC}\n" "KONTEYNER" "HOLAT" "RESTART" "UPTIME"
    separator

    while IFS= read -r line; do
        [ -z "$line" ] && continue
        total=$((total + 1))
        local name=$(echo "$line" | awk '{print $1}')
        local status=$(echo "$line" | awk '{for(i=1;i<=NF;i++) if($i ~ /Up|Exited|Restarting/) {for(j=i;j<=NF;j++) printf "%s ", $j; break}}')

        # Restart count from docker inspect
        local restarts=$(docker inspect --format='{{.RestartCount}}' "$name" 2>/dev/null || echo "0")
        # Container uptime
        local started=$(docker inspect --format='{{.State.StartedAt}}' "$name" 2>/dev/null)
        local uptime_str="-"
        if [ -n "$started" ] && [ "$started" != "0001-01-01T00:00:00Z" ]; then
            local start_epoch=$(date -d "$started" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${started%%.*}" +%s 2>/dev/null)
            if [ -n "$start_epoch" ]; then
                local now_epoch=$(date +%s)
                uptime_str=$(human_duration $((now_epoch - start_epoch)))
            fi
        fi

        local restart_color=$NC
        [ "$restarts" -gt 0 ] 2>/dev/null && restart_color=$YELLOW
        [ "$restarts" -gt 5 ] 2>/dev/null && restart_color=$RED

        if echo "$status" | grep -q "Restarting"; then
            restarting=$((restarting + 1))
            printf "  ${RED}%-25s %-12s${NC} ${restart_color}%-8s${NC} %s\n" "$name" "RESTARTING" "$restarts" "$uptime_str"
        elif echo "$status" | grep -q "Up"; then
            if echo "$status" | grep -q "unhealthy"; then
                unhealthy=$((unhealthy + 1))
                printf "  ${YELLOW}%-25s %-12s${NC} ${restart_color}%-8s${NC} %s\n" "$name" "UNHEALTHY" "$restarts" "$uptime_str"
            else
                running=$((running + 1))
                printf "  ${GREEN}%-25s %-12s${NC} ${restart_color}%-8s${NC} %s\n" "$name" "RUNNING" "$restarts" "$uptime_str"
            fi
        else
            stopped=$((stopped + 1))
            printf "  ${RED}%-25s %-12s${NC} ${restart_color}%-8s${NC} %s\n" "$name" "STOPPED" "$restarts" "-"
        fi
    done < <($DC ps -a --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | tail -n +2)

    echo ""
    echo -e "  ${BOLD}Jami: $total | ${GREEN}Running: $running${NC} | ${YELLOW}Unhealthy: $unhealthy${NC} | ${RED}Stopped: $stopped${NC} | ${RED}Restarting: $restarting${NC}"

    # Warn about high restart counts
    local high_restarts=$(docker ps -a --format '{{.Names}} {{.Status}}' 2>/dev/null | while read cname cstatus; do
        local rc=$(docker inspect --format='{{.RestartCount}}' "$cname" 2>/dev/null)
        [ "$rc" -gt 3 ] 2>/dev/null && echo "$cname($rc)"
    done)
    if [ -n "$high_restarts" ]; then
        echo ""
        warn "Ko'p restart qilgan konteynerlar: $high_restarts"
    fi
}

# ================================================================
# SECURITY — Tarmoq xavfsizligi
# ================================================================
cmd_security() {
    header "XAVFSIZLIK AUDITI"
    echo ""

    # 1. Ochiq portlar
    echo -e "  ${BOLD}1. Ochiq portlar tekshiruvi:${NC}"
    local ports_to_check=("5432:PostgreSQL" "6379:Redis" "5050:pgAdmin")
    local found_vuln=0

    for item in "${ports_to_check[@]}"; do
        local port="${item%%:*}"
        local svc_name="${item##*:}"
        if docker ps --format '{{.Ports}}' | grep "0.0.0.0:$port->" &>/dev/null; then
            fail "$svc_name (port $port) — 0.0.0.0 ga ochiq! Faqat 127.0.0.1 ga cheklang"
            found_vuln=$((found_vuln + 1))
        else
            ok "$svc_name (port $port) — Himoyalangan"
        fi
    done

    # 2. Brute-force urinishlar (oxirgi 1 soat)
    separator
    echo -e "  ${BOLD}2. Brute-force urinishlar (Postgres):${NC}"
    local brute_count=$($DC logs --since=1h postgres 2>/dev/null | grep -c "password authentication failed" || echo 0)
    if [ "$brute_count" -gt 10 ] 2>/dev/null; then
        fail "Oxirgi 1 soatda $brute_count marta parol xatosi! Brute-force bo'lishi mumkin"
    elif [ "$brute_count" -gt 0 ] 2>/dev/null; then
        warn "Oxirgi 1 soatda $brute_count marta parol xatosi"
    else
        ok "Brute-force urinishlar yo'q"
    fi

    # 3. Nginx bot/scanner so'rovlar
    separator
    echo -e "  ${BOLD}3. Bot/Scanner faolligi (oxirgi 1 soat):${NC}"
    local scanner_count=$($DC logs --since=1h --no-log-prefix nginx 2>/dev/null | grep -ciE "\.env|\.php|\.sql|wp-login|\.git|\.yml|\.bak" || echo 0)
    if [ "$scanner_count" -gt 50 ] 2>/dev/null; then
        fail "Yuqori scanner faolligi: $scanner_count so'rov! fail2ban o'rnating"
    elif [ "$scanner_count" -gt 10 ] 2>/dev/null; then
        warn "Scanner faolligi: $scanner_count so'rov"
    else
        ok "Scanner faolligi past ($scanner_count)"
    fi

    # 4. Shubhali IP lar (ko'p 4xx/5xx)
    separator
    echo -e "  ${BOLD}4. Shubhali IP manzillar (ko'p xatolik):${NC}"
    $DC logs --since=1h --no-log-prefix nginx 2>/dev/null | grep -E '" [45][0-9]{2} ' | awk '{print $1}' | sort | uniq -c | sort -rn | head -5 | while read count ip; do
        if [ "$count" -gt 50 ] 2>/dev/null; then
            fail "  $ip — $count xato so'rov (BLOKLASH TAVSIYA)"
        elif [ "$count" -gt 20 ] 2>/dev/null; then
            warn "  $ip — $count xato so'rov"
        else
            info "  $ip — $count xato so'rov"
        fi
    done

    # 5. .env fayllar tekshiruvi
    separator
    echo -e "  ${BOLD}5. Maxfiy fayllar himoyasi:${NC}"
    local env_check=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost/.env 2>/dev/null)
    if [ "$env_check" = "200" ]; then
        fail ".env fayl ochiq! Nginx da bloklang"
    else
        ok ".env fayl himoyalangan (HTTP $env_check)"
    fi
    local git_check=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost/.git/config 2>/dev/null)
    if [ "$git_check" = "200" ]; then
        fail ".git papka ochiq! Nginx da bloklang"
    else
        ok ".git papka himoyalangan (HTTP $git_check)"
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
    local steps_done=0
    
    echo -e "  ${YELLOW}1/6 Docker keraksiz (exited/dangling) konteynerlarni tozalash...${NC}"
    docker system prune -f 2>/dev/null | tail -1
    ok "Docker tozalandi!"
    steps_done=$((steps_done + 1))

    echo -e "  ${YELLOW}2/6 Eski Docker imagelarni tozalash (dangling)...${NC}"
    local removed=$(docker image prune -f 2>/dev/null | tail -1)
    ok "Eski imagelar: $removed"
    steps_done=$((steps_done + 1))

    echo -e "  ${YELLOW}3/6 Bazadagi osilgan (idle in transaction) ulanishlarni uzish...${NC}"
    local killed=$(docker exec alif24-postgres psql -U postgres -d alif24 -t -c "
        SELECT count(*) FROM (
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE state = 'idle in transaction' AND (now() - state_change) > interval '2 minute'
        ) x;
    " 2>/dev/null | xargs)
    ok "Osilgan tranzaksiyalar uzildi: ${killed:-0} ta"
    steps_done=$((steps_done + 1))

    echo -e "  ${YELLOW}4/6 Unhealthy konteynerlarni restart qilish...${NC}"
    local unhealthy_list=$(docker ps --filter "health=unhealthy" --format '{{.Names}}' 2>/dev/null)
    if [ -n "$unhealthy_list" ]; then
        for uc in $unhealthy_list; do
            echo -e "    ${DIM}Restarting: $uc${NC}"
            docker restart "$uc" &>/dev/null
        done
        ok "Unhealthy konteynerlar restart qilindi"
    else
        ok "Unhealthy konteynerlar yo'q"
    fi
    steps_done=$((steps_done + 1))

    echo -e "  ${YELLOW}5/6 Docker build cache tozalash (30 kundan eski)...${NC}"
    docker builder prune --filter "until=720h" -f 2>/dev/null | tail -1
    ok "Eski build cache tozalandi!"
    steps_done=$((steps_done + 1))

    echo -e "  ${YELLOW}6/6 PostgreSQL VACUUM ANALYZE (bazani optimallashtirish)...${NC}"
    docker exec alif24-postgres psql -U postgres -d alif24 -c "VACUUM ANALYZE;" 2>/dev/null
    ok "Baza optimallashtirildi (VACUUM ANALYZE)!"
    steps_done=$((steps_done + 1))

    echo ""
    echo -e "  ${GREEN}${BOLD}Davolash yakunlandi! $steps_done/6 qadam bajarildi.${NC}"
    echo -e "  ${DIM}Holatni ko'rish: bash diagnose.sh score${NC}"
}

# ================================================================
# 13. BACKUP — Database backup
# ================================================================
cmd_backup() {
    header "DATABASE BACKUP"
    mkdir -p "$BACKUP_DIR"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/alif24_${timestamp}.sql.gz"
    
    echo -e "  ${YELLOW}Backup boshlanmoqda...${NC}"
    echo -e "  ${DIM}Fayl: $backup_file${NC}"
    
    local start_time=$(date +%s)
    docker exec alif24-postgres pg_dump -U postgres -d alif24 --no-owner --no-acl 2>/dev/null | gzip > "$backup_file"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -sh "$backup_file" | awk '{print $1}')
        ok "Backup muvaffaqiyatli! ($size, ${duration}s)"
        
        # Eski backuplarni tozalash (7 kundan eski)
        local old_count=$(find "$BACKUP_DIR" -name "alif24_*.sql.gz" -mtime +7 2>/dev/null | wc -l)
        if [ "$old_count" -gt 0 ]; then
            find "$BACKUP_DIR" -name "alif24_*.sql.gz" -mtime +7 -delete 2>/dev/null
            info "  $old_count ta eski backup o'chirildi (7+ kun)"
        fi
        
        # Mavjud backuplar
        echo ""
        echo -e "  ${BOLD}Mavjud backuplar:${NC}"
        ls -lh "$BACKUP_DIR"/alif24_*.sql.gz 2>/dev/null | awk '{printf "    %-12s %s\n", $5, $NF}'
    else
        fail "Backup muvaffaqiyatsiz!"
        rm -f "$backup_file"
    fi
}

# ================================================================
# 14. RESTORE — Database restore
# ================================================================
cmd_restore() {
    local file="$1"
    header "DATABASE RESTORE"
    
    if [ -z "$file" ]; then
        echo -e "  ${BOLD}Mavjud backuplar:${NC}"
        ls -lh "$BACKUP_DIR"/alif24_*.sql.gz 2>/dev/null | awk '{printf "    %s — %s\n", $NF, $5}'
        echo ""
        echo -e "  ${YELLOW}Ishlatish: bash diagnose.sh restore /root/backups/alif24_YYYYMMDD_HHMMSS.sql.gz${NC}"
        return 1
    fi
    
    if [ ! -f "$file" ]; then
        fail "Fayl topilmadi: $file"
        return 1
    fi

    echo -e "  ${RED}${BOLD}DIQQAT: Bu amalni bekor qilib bo'lmaydi!${NC}"
    echo -e "  ${YELLOW}Fayl: $file${NC}"
    echo -e "  ${YELLOW}Davom etish uchun 'YES' yozing:${NC}"
    read -r confirm
    
    if [ "$confirm" != "YES" ]; then
        warn "Bekor qilindi."
        return 0
    fi
    
    echo -e "  ${YELLOW}Restore boshlanmoqda...${NC}"
    
    # Avval backup olish
    echo -e "  ${DIM}Avval joriy bazani backup qilish...${NC}"
    local pre_backup="$BACKUP_DIR/alif24_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    docker exec alif24-postgres pg_dump -U postgres -d alif24 --no-owner 2>/dev/null | gzip > "$pre_backup"
    
    # Restore
    gunzip -c "$file" | docker exec -i alif24-postgres psql -U postgres -d alif24 2>/dev/null
    
    if [ $? -eq 0 ]; then
        ok "Restore muvaffaqiyatli!"
        info "  Oldingi baza: $pre_backup"
    else
        fail "Restore muvaffaqiyatsiz! Oldingi backup: $pre_backup"
    fi
}

# ================================================================
# 15. WATCH — Auto-refresh monitoring
# ================================================================
cmd_watch() {
    local interval="${1:-5}"
    echo -e "${BOLD}${CYAN}ALIF24 LIVE MONITOR — Har ${interval}s yangilanadi (Ctrl+C to stop)${NC}"
    
    while true; do
        clear
        echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BOLD}${CYAN}║   ALIF24 LIVE MONITOR  |  $(date '+%H:%M:%S')  |  Har ${interval}s    ║${NC}"
        echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
        
        # Containers mini-status
        echo ""
        echo -e "  ${BOLD}KONTEYNERLAR:${NC}"
        docker ps --format '{{.Names}}\t{{.Status}}' 2>/dev/null | while IFS=$'\t' read name status; do
            if echo "$status" | grep -q "unhealthy"; then
                printf "  ${YELLOW}%-28s %s${NC}\n" "$name" "$status"
            elif echo "$status" | grep -q "Up"; then
                printf "  ${GREEN}%-28s %s${NC}\n" "$name" "$status"
            else
                printf "  ${RED}%-28s %s${NC}\n" "$name" "$status"
            fi
        done
        
        # Resource usage
        echo ""
        echo -e "  ${BOLD}RESURSLAR:${NC}"
        docker stats --no-stream --format "  {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -10 | column -t
        
        # Quick metrics
        echo ""
        local mem_pct=$(free 2>/dev/null | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
        local disk_pct=$(df / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
        local load=$(cat /proc/loadavg 2>/dev/null | awk '{print $1}')
        echo -e "  ${BOLD}SERVER:${NC} CPU Load: $load | RAM: ${mem_pct}% | Disk: ${disk_pct}%"
        
        # Errors in last minute
        local err_count=$($DC logs --since=1m 2>/dev/null | grep -ciE "error|exception|fatal" || echo 0)
        if [ "$err_count" -gt 0 ]; then
            echo -e "  ${RED}XATOLIKLAR (oxirgi 1m): $err_count${NC}"
        else
            echo -e "  ${GREEN}XATOLIKLAR: 0${NC}"
        fi
        
        echo ""
        echo -e "  ${DIM}Ctrl+C — chiqish | Yangilanish: har ${interval}s${NC}"
        sleep "$interval"
    done
}

# ================================================================
# 16. NETWORK — Docker network diagnostika
# ================================================================
cmd_network() {
    header "DOCKER NETWORK DIAGNOSTIKA"
    echo ""
    
    # Docker networks
    echo -e "  ${BOLD}Docker tarmoqlar:${NC}"
    docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" 2>/dev/null | head -10
    
    # Inter-service connectivity
    echo ""
    echo -e "  ${BOLD}Konteynerlar orasidagi aloqa:${NC}"
    
    # Backend → Postgres
    local pg_ok=$(docker exec main-backend python3 -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('postgres',5432)); print('ok'); s.close()" 2>/dev/null)
    [ "$pg_ok" = "ok" ] && ok "main-backend → postgres:5432" || fail "main-backend → postgres:5432 — ULANMAYDI!"
    
    # Backend → Redis
    local redis_ok=$(docker exec main-backend python3 -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('redis',6379)); print('ok'); s.close()" 2>/dev/null)
    [ "$redis_ok" = "ok" ] && ok "main-backend → redis:6379" || fail "main-backend → redis:6379 — ULANMAYDI!"
    
    # Nginx → backends
    separator
    echo -e "  ${BOLD}Nginx → Backend aloqasi:${NC}"
    for i in "${!BACKENDS[@]}"; do
        local svc=${BACKENDS[$i]}
        local port=${BACKEND_PORTS[$i]}
        local code=$(docker exec alif24-gateway curl -s --max-time 2 -o /dev/null -w "%{http_code}" "http://${svc}:${port}/health" 2>/dev/null)
        if [ "$code" = "200" ]; then
            ok "nginx → $svc:$port (HTTP $code)"
        elif [ "$code" = "000" ] || [ -z "$code" ]; then
            fail "nginx → $svc:$port — ULANMAYDI!"
        else
            warn "nginx → $svc:$port (HTTP $code)"
        fi
    done
    
    # DNS resolution
    separator
    echo -e "  ${BOLD}DNS aloqasi:${NC}"
    local dns_ok=$(docker exec main-backend python3 -c "import socket; socket.getaddrinfo('postgres',5432); print('ok')" 2>/dev/null)
    [ "$dns_ok" = "ok" ] && ok "Docker DNS ishlayapti" || fail "Docker DNS ISHLAMAYAPTI!"
    
    # External connectivity
    local ext_ok=$(docker exec main-backend python3 -c "import urllib.request; urllib.request.urlopen('https://httpbin.org/get',timeout=5); print('ok')" 2>/dev/null)
    [ "$ext_ok" = "ok" ] && ok "Tashqi internet aloqasi bor" || warn "Tashqi internet aloqasi yo'q yoki sekin"
}

# ================================================================
# 17. DEPLOY — Tezkor deploy
# ================================================================
cmd_deploy() {
    header "TEZKOR DEPLOY"
    echo ""
    
    local start_time=$(date +%s)
    
    # 1. Git pull
    echo -e "  ${YELLOW}1/4 Git pull...${NC}"
    local git_output=$(cd "$(dirname "$0")" && git pull origin main 2>&1)
    echo -e "  ${DIM}$git_output${NC}"
    
    if echo "$git_output" | grep -q "Already up to date"; then
        ok "Yangilanish yo'q — hamma narsa yangi"
        return 0
    fi
    
    # 2. O'zgargan servicelarni aniqlash
    echo -e "  ${YELLOW}2/4 O'zgargan servicelarni aniqlash...${NC}"
    local changed_files=$(cd "$(dirname "$0")" && git diff --name-only HEAD~1 HEAD 2>/dev/null)
    local services_to_rebuild=""
    
    if echo "$changed_files" | grep -q "MainPlatform/backend"; then
        services_to_rebuild="$services_to_rebuild main-backend"
    fi
    if echo "$changed_files" | grep -q "MainPlatform/frontend"; then
        services_to_rebuild="$services_to_rebuild main-frontend"
    fi
    if echo "$changed_files" | grep -q "Olimp/backend"; then
        services_to_rebuild="$services_to_rebuild olimp-backend"
    fi
    if echo "$changed_files" | grep -q "Olimp/frontend"; then
        services_to_rebuild="$services_to_rebuild olimp-frontend"
    fi
    if echo "$changed_files" | grep -q "Harf/"; then
        services_to_rebuild="$services_to_rebuild harf-backend harf-frontend"
    fi
    if echo "$changed_files" | grep -q "TestAI/"; then
        services_to_rebuild="$services_to_rebuild testai-backend testai-frontend"
    fi
    if echo "$changed_files" | grep -q "CRM/"; then
        services_to_rebuild="$services_to_rebuild crm-backend crm-frontend"
    fi
    if echo "$changed_files" | grep -q "Games/"; then
        services_to_rebuild="$services_to_rebuild games-backend games-frontend"
    fi
    if echo "$changed_files" | grep -q "shared/"; then
        services_to_rebuild="main-backend olimp-backend harf-backend testai-backend crm-backend games-backend lessions-backend"
    fi
    if echo "$changed_files" | grep -q "nginx\|gateway\|docker-compose"; then
        services_to_rebuild="$services_to_rebuild nginx"
    fi
    
    services_to_rebuild=$(echo "$services_to_rebuild" | xargs -n1 | sort -u | xargs)
    
    if [ -z "$services_to_rebuild" ]; then
        ok "Rebuild kerak bo'lgan service yo'q"
        return 0
    fi
    
    info "  Rebuild: $services_to_rebuild"
    
    # 3. Backup
    echo -e "  ${YELLOW}3/4 Tezkor backup...${NC}"
    mkdir -p "$BACKUP_DIR"
    docker exec alif24-postgres pg_dump -U postgres -d alif24 --no-owner 2>/dev/null | gzip > "$BACKUP_DIR/alif24_pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
    ok "Backup olindi"
    
    # 4. Rebuild
    echo -e "  ${YELLOW}4/4 Rebuild + restart...${NC}"
    $DC up -d --build $services_to_rebuild
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    ok "Deploy yakunlandi! (${duration}s)"
    echo ""
    
    # Health check
    sleep 3
    echo -e "  ${BOLD}Health check:${NC}"
    for svc in $services_to_rebuild; do
        local state=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "no-healthcheck")
        local running=$(docker inspect --format='{{.State.Running}}' "$svc" 2>/dev/null)
        if [ "$running" = "true" ]; then
            if [ "$state" = "healthy" ] || [ "$state" = "no-healthcheck" ]; then
                ok "$svc — ishlayapti"
            else
                warn "$svc — $state (tekshirilmoqda...)"
            fi
        else
            fail "$svc — ISHLAMAYAPTI!"
        fi
    done
}

# ================================================================
# 18. REPORT — Diagnostikani faylga saqlash
# ================================================================
cmd_report() {
    mkdir -p "$REPORT_DIR"
    local report_file="$REPORT_DIR/alif24_report_$(date +%Y%m%d_%H%M%S).txt"
    header "DIAGNOSTIKA HISOBOTI"
    echo -e "  ${YELLOW}Hisobot yozilmoqda: $report_file${NC}"
    
    # Run full diagnostics and capture output (strip colors)
    cmd_full 2>&1 | sed 's/\x1b\[[0-9;]*m//g' > "$report_file"
    
    local size=$(du -sh "$report_file" | awk '{print $1}')
    ok "Hisobot saqlandi: $report_file ($size)"
    
    # Eski hisobotlarni tozalash (30 kundan eski)
    find "$REPORT_DIR" -name "alif24_report_*.txt" -mtime +30 -delete 2>/dev/null
    
    echo ""
    echo -e "  ${BOLD}Mavjud hisobotlar:${NC}"
    ls -lh "$REPORT_DIR"/alif24_report_*.txt 2>/dev/null | tail -5 | awk '{printf "    %s — %s\n", $NF, $5}'
}

# ================================================================
# 19. DIFF — Git o'zgarishlar
# ================================================================
cmd_diff() {
    local count="${1:-5}"
    header "OXIRGI GIT O'ZGARISHLAR"
    echo ""
    
    local repo_dir=$(cd "$(dirname "$0")" && pwd)
    
    echo -e "  ${BOLD}Oxirgi $count ta commit:${NC}"
    cd "$repo_dir" && git log --oneline --no-decorate -n "$count" 2>/dev/null | while IFS= read -r line; do
        local hash=$(echo "$line" | awk '{print $1}')
        local msg=$(echo "$line" | cut -d' ' -f2-)
        printf "  ${CYAN}%s${NC} %s\n" "$hash" "$msg"
    done
    
    echo ""
    echo -e "  ${BOLD}Oxirgi commitdagi o'zgarishlar:${NC}"
    cd "$repo_dir" && git diff --stat HEAD~1 HEAD 2>/dev/null | while IFS= read -r line; do
        echo -e "    ${DIM}$line${NC}"
    done
    
    # Uncommitted changes
    local uncommitted=$(cd "$repo_dir" && git status --short 2>/dev/null)
    if [ -n "$uncommitted" ]; then
        echo ""
        echo -e "  ${BOLD}${YELLOW}Commit qilinmagan o'zgarishlar:${NC}"
        echo "$uncommitted" | while IFS= read -r line; do
            echo -e "    ${YELLOW}$line${NC}"
        done
    fi
    
    # Current branch
    local branch=$(cd "$repo_dir" && git branch --show-current 2>/dev/null)
    local remote_diff=$(cd "$repo_dir" && git rev-list --left-right --count origin/$branch...$branch 2>/dev/null)
    local behind=$(echo "$remote_diff" | awk '{print $1}')
    local ahead=$(echo "$remote_diff" | awk '{print $2}')
    echo ""
    echo -e "  ${BOLD}Branch:${NC} $branch"
    [ "$behind" -gt 0 ] 2>/dev/null && warn "Remote dan $behind commit orqada (git pull kerak)"
    [ "$ahead" -gt 0 ] 2>/dev/null && warn "Remote dan $ahead commit oldinda (git push kerak)"
    [ "$behind" = "0" ] && [ "$ahead" = "0" ] && ok "Remote bilan sinxron"
}

# ================================================================
# 20. SCORE — Umumiy sog'liq bali
# ================================================================
cmd_score() {
    # Reset score
    SCORE_TOTAL=0
    SCORE_PASS=0
    
    header "UMUMIY SOG'LIQ BALI"
    echo ""
    
    echo -e "  ${DIM}Tekshiruvlar boshlanmoqda...${NC}"
    echo ""
    
    # 1. Containers running
    echo -e "  ${BOLD}Konteynerlar:${NC}"
    local total_containers=$(docker ps -a --format '{{.Names}}' 2>/dev/null | wc -l)
    local running_containers=$(docker ps --format '{{.Names}}' 2>/dev/null | wc -l)
    if [ "$total_containers" -eq "$running_containers" ] && [ "$total_containers" -gt 0 ]; then
        ok "Barcha $total_containers konteyner ishlayapti"
    else
        fail "$running_containers/$total_containers konteyner ishlayapti"
    fi
    
    # Unhealthy check
    local unhealthy=$(docker ps --filter "health=unhealthy" --format '{{.Names}}' 2>/dev/null | wc -l)
    [ "$unhealthy" -eq 0 ] && ok "Unhealthy konteyner yo'q" || fail "$unhealthy ta unhealthy konteyner"
    
    # 2. Backends health
    separator
    echo -e "  ${BOLD}Backend health:${NC}"
    for i in "${!BACKENDS[@]}"; do
        local code=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost:${BACKEND_PORTS[$i]}/health 2>/dev/null)
        [ "$code" = "200" ] && ok "${SERVICE_NAMES[$i]} backend — OK" || fail "${SERVICE_NAMES[$i]} backend — HTTP $code"
    done
    
    # 3. Database
    separator
    echo -e "  ${BOLD}Database:${NC}"
    docker exec alif24-postgres pg_isready -U postgres &>/dev/null && ok "PostgreSQL ishlayapti" || fail "PostgreSQL ISHLAMAYAPTI"
    docker exec alif24-redis redis-cli ping &>/dev/null && ok "Redis ishlayapti" || fail "Redis ISHLAMAYAPTI"
    
    local idle_tx=$(docker exec alif24-postgres psql -U postgres -d alif24 -t -c "
        SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction' AND (now() - state_change) > interval '1 minute';
    " 2>/dev/null | xargs)
    [ "$idle_tx" = "0" ] || [ -z "$idle_tx" ] && ok "Osilgan tranzaksiyalar yo'q" || fail "$idle_tx ta osilgan tranzaksiya"
    
    # 4. Resources
    separator
    echo -e "  ${BOLD}Server resurslari:${NC}"
    local mem_pct=$(free 2>/dev/null | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
    if [ -n "$mem_pct" ]; then
        [ "$mem_pct" -lt 85 ] 2>/dev/null && ok "RAM: ${mem_pct}% ishlatilgan" || fail "RAM: ${mem_pct}% — YUQORI!"
    fi
    
    local disk_pct=$(df / 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
    if [ -n "$disk_pct" ]; then
        [ "$disk_pct" -lt 85 ] 2>/dev/null && ok "Disk: ${disk_pct}% ishlatilgan" || fail "Disk: ${disk_pct}% — YUQORI!"
    fi
    
    # 5. SSL
    separator
    echo -e "  ${BOLD}SSL:${NC}"
    local ssl_expiry=$(curl -skIv "https://$DOMAIN" 2>&1 | grep "expire date" | sed 's/.*expire date: //')
    if [ -n "$ssl_expiry" ]; then
        local expiry_epoch=$(date -d "$ssl_expiry" +%s 2>/dev/null)
        local now_epoch=$(date +%s)
        if [ -n "$expiry_epoch" ]; then
            local days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
            if [ "$days_left" -gt 14 ]; then
                ok "SSL sertifikat: $days_left kun qoldi"
            elif [ "$days_left" -gt 0 ]; then
                warn "SSL sertifikat: $days_left kun qoldi — YANGILANG!"
            else
                fail "SSL sertifikat MUDDATI O'TGAN!"
            fi
        else
            ok "SSL sertifikat mavjud: $ssl_expiry"
        fi
    else
        warn "SSL tekshirib bo'lmadi"
    fi
    
    # 6. Errors in last hour
    separator
    echo -e "  ${BOLD}Xatoliklar (oxirgi 1 soat):${NC}"
    local err_count=$($DC logs --since=1h 2>/dev/null | grep -ciE "error|exception|fatal|traceback" || echo 0)
    if [ "$err_count" -lt 10 ]; then
        ok "Xatoliklar kam: $err_count"
    elif [ "$err_count" -lt 50 ]; then
        warn "Xatoliklar: $err_count"
    else
        fail "Xatoliklar ko'p: $err_count"
    fi
    
    # Calculate final score
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local score=0
    if [ "$SCORE_TOTAL" -gt 0 ]; then
        score=$((SCORE_PASS * 100 / SCORE_TOTAL))
    fi
    
    local grade_color=$RED
    local grade="F"
    local emoji="💀"
    if [ "$score" -ge 95 ]; then
        grade_color=$GREEN; grade="A+"; emoji="🏆"
    elif [ "$score" -ge 90 ]; then
        grade_color=$GREEN; grade="A"; emoji="🌟"
    elif [ "$score" -ge 80 ]; then
        grade_color=$GREEN; grade="B"; emoji="👍"
    elif [ "$score" -ge 70 ]; then
        grade_color=$YELLOW; grade="C"; emoji="⚠️"
    elif [ "$score" -ge 50 ]; then
        grade_color=$YELLOW; grade="D"; emoji="😰"
    fi
    
    echo ""
    echo -e "  ${BOLD}NATIJA: ${grade_color}${score}% — $grade $emoji${NC}"
    echo -e "  ${DIM}Tekshiruvlar: $SCORE_PASS/$SCORE_TOTAL muvaffaqiyatli${NC}"
    progress_bar $score
    
    if [ "$score" -lt 70 ]; then
        echo ""
        echo -e "  ${YELLOW}Tavsiya: bash diagnose.sh heal — muammolarni tuzatish${NC}"
    fi
}

# ================================================================
# 21. TOP — Eng ko'p resurs ishlatayotgan konteynerlar
# ================================================================
cmd_top() {
    header "KONTEYNER RESURS REYTINGI"
    echo ""
    
    echo -e "  ${BOLD}CPU bo'yicha (yuqoridan pastga):${NC}"
    docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null | \
        sort -t$'\t' -k2 -rn | head -10 | while IFS=$'\t' read name cpu mem mempct net block; do
        local cpu_num=$(echo "$cpu" | tr -d '%')
        local color=$GREEN
        [ "$(echo "$cpu_num > 50" | bc -l 2>/dev/null || echo 0)" = "1" ] && color=$YELLOW
        [ "$(echo "$cpu_num > 80" | bc -l 2>/dev/null || echo 0)" = "1" ] && color=$RED
        printf "  ${color}%-25s CPU: %-8s MEM: %-20s NET: %s${NC}\n" "$name" "$cpu" "$mem" "$net"
    done
    
    echo ""
    echo -e "  ${BOLD}Memory bo'yicha (yuqoridan pastga):${NC}"
    docker stats --no-stream --format "{{.Name}}\t{{.MemPerc}}\t{{.MemUsage}}" 2>/dev/null | \
        sort -t$'\t' -k2 -rn | head -10 | while IFS=$'\t' read name mempct mem; do
        local mem_num=$(echo "$mempct" | tr -d '%')
        local color=$GREEN
        [ "$(echo "$mem_num > 30" | bc -l 2>/dev/null || echo 0)" = "1" ] && color=$YELLOW
        [ "$(echo "$mem_num > 60" | bc -l 2>/dev/null || echo 0)" = "1" ] && color=$RED
        printf "  ${color}%-25s MEM: %-8s (%s)${NC}\n" "$name" "$mempct" "$mem"
    done
    
    # Total Docker resource usage
    echo ""
    separator
    local total_mem=$(docker stats --no-stream --format "{{.MemUsage}}" 2>/dev/null | awk -F'/' '{
        gsub(/[^0-9.]/, "", $1);
        if($1 ~ /GiB/) sum += $1 * 1024;
        else sum += $1;
    } END {printf "%.0f MiB", sum}')
    echo -e "  ${BOLD}Jami Docker xotira:${NC} $total_mem"
}

# ================================================================
# 22. SSL — SSL sertifikat batafsil tekshiruvi
# ================================================================
cmd_ssl() {
    header "SSL SERTIFIKAT TEKSHIRUVI"
    echo ""
    
    local domains=("$DOMAIN" "olimp.$DOMAIN" "harf.$DOMAIN" "testai.$DOMAIN" "crm.$DOMAIN" "games.$DOMAIN")
    
    printf "  ${BOLD}%-25s %-12s %-15s %s${NC}\n" "DOMEN" "HOLAT" "MUDDATI" "QOLGAN"
    separator
    
    for domain in "${domains[@]}"; do
        local ssl_info=$(curl -skIv "https://$domain" 2>&1)
        local expiry=$(echo "$ssl_info" | grep "expire date" | sed 's/.*expire date: //')
        local status_code=$(curl -sk --max-time 5 -o /dev/null -w "%{http_code}" "https://$domain" 2>/dev/null)
        
        if [ -n "$expiry" ]; then
            local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null)
            local now_epoch=$(date +%s)
            local days_left=""
            local color=$GREEN
            local status_text="OK"
            
            if [ -n "$expiry_epoch" ]; then
                days_left="$((  (expiry_epoch - now_epoch) / 86400 )) kun"
                [ "$((expiry_epoch - now_epoch))" -lt $((14 * 86400)) ] && color=$YELLOW && status_text="TEZDA!"
                [ "$((expiry_epoch - now_epoch))" -lt 0 ] && color=$RED && status_text="O'TGAN!"
            else
                days_left="noma'lum"
            fi
            
            local short_expiry=$(echo "$expiry" | awk '{print $1, $2, $4}')
            printf "  ${color}%-25s %-12s %-15s %s${NC}\n" "$domain" "$status_text" "$short_expiry" "$days_left"
        else
            if [ "$status_code" = "000" ]; then
                printf "  ${RED}%-25s %-12s %-15s %s${NC}\n" "$domain" "ULANMADI" "-" "-"
            else
                printf "  ${YELLOW}%-25s %-12s %-15s %s${NC}\n" "$domain" "HTTP $status_code" "SSL yo'q" "-"
            fi
        fi
    done
}

# ================================================================
# FULL DIAGNOSTIKA
# ================================================================
cmd_full() {
    # Reset score for full run
    SCORE_TOTAL=0
    SCORE_PASS=0
    
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║     ALIF24 PLATFORM — TO'LIQ DIAGNOSTIKA v${VERSION}         ║${NC}"
    echo -e "${BOLD}${CYAN}║     $(date '+%Y-%m-%d %H:%M:%S %Z')                          ║${NC}"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

    cmd_status
    cmd_security
    cmd_health
    cmd_ssl
    cmd_errors 30
    cmd_perf

    # Final score
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    local score=0
    if [ "$SCORE_TOTAL" -gt 0 ]; then
        score=$((SCORE_PASS * 100 / SCORE_TOTAL))
    fi
    local grade_color=$RED grade="F"
    [ "$score" -ge 95 ] && grade_color=$GREEN && grade="A+"
    [ "$score" -ge 90 ] && [ "$score" -lt 95 ] && grade_color=$GREEN && grade="A"
    [ "$score" -ge 80 ] && [ "$score" -lt 90 ] && grade_color=$GREEN && grade="B"
    [ "$score" -ge 70 ] && [ "$score" -lt 80 ] && grade_color=$YELLOW && grade="C"
    [ "$score" -ge 50 ] && [ "$score" -lt 70 ] && grade_color=$YELLOW && grade="D"

    echo -e "  ${BOLD}UMUMIY BAL: ${grade_color}${score}% — $grade${NC}  ${DIM}($SCORE_PASS/$SCORE_TOTAL tekshiruv)${NC}"
    progress_bar $score

    header "TEZKOR BUYRUQLAR"
    echo ""
    echo -e "  ${BOLD}${UNDERLINE}Monitoring:${NC}"
    echo -e "    ${BOLD}bash diagnose.sh watch${NC}         — Live dashboard (auto-refresh)"
    echo -e "    ${BOLD}bash diagnose.sh score${NC}         — Sog'liq bali"
    echo -e "    ${BOLD}bash diagnose.sh top${NC}           — Resurs reytingi"
    echo -e "    ${BOLD}bash diagnose.sh status${NC}        — Container holatlari"
    echo -e "    ${BOLD}bash diagnose.sh health${NC}        — Health check"
    echo ""
    echo -e "  ${BOLD}${UNDERLINE}Loglar:${NC}"
    echo -e "    ${BOLD}bash diagnose.sh errors 100${NC}    — Oxirgi 100 xatolik"
    echo -e "    ${BOLD}bash diagnose.sh requests 50${NC}   — So'rovlar"
    echo -e "    ${BOLD}bash diagnose.sh logs main-backend 50${NC} — Loglar"
    echo -e "    ${BOLD}bash diagnose.sh follow nginx${NC}  — Real-time log"
    echo ""
    echo -e "  ${BOLD}${UNDERLINE}Baza & Xavfsizlik:${NC}"
    echo -e "    ${BOLD}bash diagnose.sh db${NC}            — Database holati"
    echo -e "    ${BOLD}bash diagnose.sh backup${NC}        — DB backup"
    echo -e "    ${BOLD}bash diagnose.sh ssl${NC}           — SSL tekshiruvi"
    echo -e "    ${BOLD}bash diagnose.sh network${NC}       — Tarmoq diagnostika"
    echo ""
    echo -e "  ${BOLD}${UNDERLINE}Amallar:${NC}"
    echo -e "    ${BOLD}bash diagnose.sh deploy${NC}        — Tezkor deploy (git pull + rebuild)"
    echo -e "    ${BOLD}bash diagnose.sh heal${NC}          — Auto-fix (tozalash)"
    echo -e "    ${BOLD}bash diagnose.sh rebuild olimp-backend${NC} — Qayta build"
    echo -e "    ${BOLD}bash diagnose.sh report${NC}        — Hisobotni faylga saqlash"
    echo ""
}

# ================================================================
# MAIN — Command router
# ================================================================
case "${1:-full}" in
    status)   cmd_status ;;
    security) cmd_security ;;
    health)   cmd_health ;;
    logs)     cmd_logs "$2" "$3" ;;
    errors)   cmd_errors "$2" ;;
    requests) cmd_requests "$2" ;;
    db)       cmd_db ;;
    perf)     cmd_perf ;;
    api)      cmd_api "$2" "$3" ;;
    heal)     cmd_heal ;;
    backup)   cmd_backup ;;
    restore)  cmd_restore "$2" ;;
    watch)    cmd_watch "$2" ;;
    network)  cmd_network ;;
    deploy)   cmd_deploy ;;
    report)   cmd_report ;;
    diff)     cmd_diff "$2" ;;
    score)    cmd_score ;;
    top)      cmd_top ;;
    ssl)      cmd_ssl ;;
    restart)  cmd_restart "$2" ;;
    rebuild)  cmd_rebuild "$2" ;;
    follow)   cmd_follow "$2" ;;
    full)     cmd_full ;;
    help|--help|-h)
        echo ""
        echo -e "${BOLD}${CYAN}  ALIF24 Diagnostika Tool v${VERSION}${NC}"
        echo ""
        echo -e "  ${BOLD}Ishlatish:${NC} bash diagnose.sh [command] [args]"
        echo ""
        echo -e "  ${BOLD}${UNDERLINE}Monitoring:${NC}"
        echo "    (bo'sh)          To'liq diagnostika + baho"
        echo "    status           Container holatlari + restart count + uptime"
        echo "    health           Backend/Frontend health check"
        echo "    score            Umumiy sog'liq bali (0-100, A-F baho)"
        echo "    top              Konteyner resurs reytingi (CPU/RAM)"
        echo "    watch [N]        Live dashboard, har N sekundda yangilanadi (default: 5)"
        echo ""
        echo -e "  ${BOLD}${UNDERLINE}Loglar & So'rovlar:${NC}"
        echo "    logs [svc] [N]   Loglar (default: all, 30)"
        echo "    errors [N]       Faqat xatoliklar"
        echo "    requests [N]     Nginx so'rovlar"
        echo "    follow [svc]     Real-time log (Ctrl+C bilan to'xtatish)"
        echo ""
        echo -e "  ${BOLD}${UNDERLINE}Baza & Infra:${NC}"
        echo "    db               Database holati + statistika"
        echo "    backup           Database backup (/root/backups/)"
        echo "    restore [file]   Database restore (backup fayldan)"
        echo "    network          Docker network diagnostika"
        echo ""
        echo -e "  ${BOLD}${UNDERLINE}Xavfsizlik:${NC}"
        echo "    security         Xavfsizlik auditi (portlar, brute-force, scannerlar)"
        echo "    ssl              SSL sertifikat tekshiruvi (barcha domenlar)"
        echo ""
        echo -e "  ${BOLD}${UNDERLINE}Amallar:${NC}"
        echo "    deploy           Tezkor deploy (git pull + aqlli rebuild)"
        echo "    heal             Auto-fix (tozalash, optimize, restart)"
        echo "    restart [svc]    Service restart"
        echo "    rebuild [svc]    Build + restart"
        echo "    perf             CPU, RAM, Disk, Docker stats"
        echo ""
        echo -e "  ${BOLD}${UNDERLINE}Boshqa:${NC}"
        echo "    api [path] [port] API endpoint test"
        echo "    diff [N]          Oxirgi N ta git commit (default: 5)"
        echo "    report            To'liq diagnostikani faylga saqlash"
        echo "    help              Shu yordam"
        echo ""
        ;;
    *)
        echo -e "${RED}Noma'lum buyruq: $1${NC}"
        echo "bash diagnose.sh help — yordam"
        ;;
esac
