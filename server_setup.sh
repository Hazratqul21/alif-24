#!/bin/bash
# ============================================================
# Alif24 - VDS Server Avtomatik Sozlash Skripti
# ISHLATISH: ./server_setup.sh ali24.uz
# ============================================================

set -e

DOMAIN="${1:-ali24.uz}"
PROJECT_DIR="/opt/alif24"
DATA_DIR="/data"
BACKUP_DIR="/data/backups"
REPO_URL="${2:-}"  # Ikkinchi argument sifatida repo URL

# Ranglar
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║     █████╗ ██╗     ██╗███████╗██████╗ ██╗  ██╗      ║"
echo "║    ██╔══██╗██║     ██║██╔════╝╚════██╗██║  ██║      ║"
echo "║    ███████║██║     ██║█████╗   █████╔╝███████║      ║"
echo "║    ██╔══██║██║     ██║██╔══╝  ██╔═══╝ ╚════██║      ║"
echo "║    ██║  ██║███████╗██║██║     ███████╗     ██║      ║"
echo "║    ╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝     ╚═╝      ║"
echo "║                                                      ║"
echo "║         🚀 VDS Server Setup Script 🚀                ║"
echo "║         Domen: $DOMAIN                   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Root tekshirish
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Bu skriptni root sifatida ishga tushiring: sudo ./server_setup.sh${NC}"
    exit 1
fi

# ============================================================
# 1. TIZIMNI YANGILASH
# ============================================================
echo -e "\n${BLUE}═══ 1/10 Tizimni yangilash ═══${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✅ Tizim yangilandi${NC}"

# ============================================================
# 2. KERAKLI DASTURLARNI O'RNATISH
# ============================================================
echo -e "\n${BLUE}═══ 2/10 Kerakli dasturlarni o'rnatish ═══${NC}"
apt install -y \
    git \
    curl \
    wget \
    htop \
    nano \
    ufw \
    fail2ban \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common
echo -e "${GREEN}✅ Asosiy dasturlar o'rnatildi${NC}"

# ============================================================
# 3. DOCKER O'RNATISH
# ============================================================
echo -e "\n${BLUE}═══ 3/10 Docker o'rnatish ═══${NC}"
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker allaqachon o'rnatilgan${NC}"
else
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker o'rnatildi${NC}"
fi

# Docker Compose (plugin)
if docker compose version &> /dev/null; then
    echo -e "${YELLOW}Docker Compose allaqachon mavjud${NC}"
else
    apt install -y docker-compose-plugin
    echo -e "${GREEN}✅ Docker Compose o'rnatildi${NC}"
fi

# ============================================================
# 4. FIREWALL (UFW)
# ============================================================
echo -e "\n${BLUE}═══ 4/10 Firewall sozlash ═══${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5050/tcp  # pgAdmin
ufw --force enable
echo -e "${GREEN}✅ Firewall sozlandi (22, 80, 443, 5050)${NC}"

# ============================================================
# 5. SWAP FAYL (Agar RAM yetmasa)
# ============================================================
echo -e "\n${BLUE}═══ 5/10 Swap fayl yaratish ═══${NC}"
if [ -f /swapfile ]; then
    echo -e "${YELLOW}Swap allaqachon mavjud${NC}"
else
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}✅ 4GB Swap yaratildi${NC}"
fi

# ============================================================
# 6. DATA PAPKALARI
# ============================================================
echo -e "\n${BLUE}═══ 6/10 Data papkalarini yaratish ═══${NC}"
mkdir -p "$DATA_DIR/postgres"
mkdir -p "$BACKUP_DIR"
mkdir -p "$PROJECT_DIR"
echo -e "${GREEN}✅ /data/postgres, /data/backups, /opt/alif24 yaratildi${NC}"

# ============================================================
# 7. LOYIHANI KLONLASH
# ============================================================
echo -e "\n${BLUE}═══ 7/10 Loyihani klonlash ═══${NC}"
if [ -d "$PROJECT_DIR/.git" ]; then
    echo -e "${YELLOW}Loyiha allaqachon mavjud. Git pull...${NC}"
    cd "$PROJECT_DIR"
    git pull || echo -e "${YELLOW}⚠️ Git pull amalga oshmadi${NC}"
elif [ -n "$REPO_URL" ]; then
    git clone "$REPO_URL" "$PROJECT_DIR"
    echo -e "${GREEN}✅ Loyiha klonlandi${NC}"
else
    echo -e "${YELLOW}⚠️ Repository URL ko'rsatilmagan.${NC}"
    echo -e "${YELLOW}   Qo'lda klonlang: git clone <URL> $PROJECT_DIR${NC}"
fi

# ============================================================
# 8. NGINX O'RNATISH VA SOZLASH
# ============================================================
echo -e "\n${BLUE}═══ 8/10 Nginx o'rnatish va sozlash ═══${NC}"
apt install -y nginx

# Nginx konfiguratsiya
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_CONF'
# Alif24 - Nginx Reverse Proxy
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    # Frontend (MainPlatform)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
        proxy_connect_timeout 120;
    }

    # Telegram Webhook
    location /api/telegram/webhook {
        proxy_pass http://localhost:8000/api/v1/telegram/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Harf Backend
    location /harf-api/ {
        proxy_pass http://localhost:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # TestAI Backend
    location /testai-api/ {
        proxy_pass http://localhost:8002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # CRM Backend
    location /crm-api/ {
        proxy_pass http://localhost:8003/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Games Backend
    location /games-api/ {
        proxy_pass http://localhost:8004/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Olimp Backend
    location /olimp-api/ {
        proxy_pass http://localhost:8005/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Lessions Backend
    location /lessions-api/ {
        proxy_pass http://localhost:8006/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Fayl yuklash hajmi
    client_max_body_size 50M;
}
NGINX_CONF

# Domenni almashtirish
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

# Saytni faollashtirish
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Nginx tekshirish va qayta ishga tushirish
nginx -t && systemctl restart nginx
echo -e "${GREEN}✅ Nginx sozlandi ($DOMAIN)${NC}"

# ============================================================
# 9. SSL SERTIFIKAT (Let's Encrypt)
# ============================================================
echo -e "\n${BLUE}═══ 9/10 SSL sertifikat o'rnatish ═══${NC}"
apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}SSL sertifikat olish uchun domen ($DOMAIN) DNS A record VDS IP ga yo'naltirilgan bo'lishi kerak.${NC}"
echo -e "${YELLOW}SSL sertifikat olmoqchimisiz? (y/n)${NC}"
read -r ssl_answer

if [ "$ssl_answer" = "y" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || \
        echo -e "${YELLOW}⚠️ SSL xatolik. DNS A record tekshiring.${NC}"
    
    # SSL avtomatik yangilash
    echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
    echo -e "${GREEN}✅ SSL sertifikat o'rnatildi va auto-renew sozlandi${NC}"
else
    echo -e "${YELLOW}⚠️ SSL keyinroq o'rnatiladi${NC}"
fi

# ============================================================
# 10. CRON JOBLAR
# ============================================================
echo -e "\n${BLUE}═══ 10/10 Cron joblar sozlash ═══${NC}"

# DB Backup — kuniga 1 marta (soat 3:00)
CRON_BACKUP="0 3 * * * cd $PROJECT_DIR && docker compose exec -T postgres pg_dump -U postgres alif24 > $BACKUP_DIR/alif24_\$(date +\%Y\%m\%d).sql 2>/dev/null"

# Eski backuplarni tozalash — 30 kundan eski
CRON_CLEANUP="0 4 * * * find $BACKUP_DIR -name '*.sql' -mtime +30 -delete"

# Crontab ga qo'shish
(crontab -l 2>/dev/null | grep -v "pg_dump"; echo "$CRON_BACKUP"; echo "$CRON_CLEANUP") | crontab -
echo -e "${GREEN}✅ Kunlik DB backup va tozalash sozlandi${NC}"

# ============================================================
# YAKUNIY HISOBOT
# ============================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            ✅ SERVER SOZLASH YAKUNLANDI!            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📋 O'rnatilganlar:${NC}"
echo "   ✅ Docker + Docker Compose"
echo "   ✅ Nginx (reverse proxy)"
echo "   ✅ UFW Firewall (22, 80, 443, 5050)"
echo "   ✅ 4GB Swap"
echo "   ✅ Fail2Ban (xavfsizlik)"
echo "   ✅ Kunlik DB backup cron"
echo ""
echo -e "${GREEN}📁 Muhim papkalar:${NC}"
echo "   /opt/alif24/          — Loyiha kodi"
echo "   /data/postgres/       — DB ma'lumotlari (alohida!)"
echo "   /data/backups/        — DB backuplar"
echo ""
echo -e "${GREEN}🔧 Keyingi qadamlar:${NC}"
echo "   1. .env faylni sozlang:"
echo "      cd $PROJECT_DIR && cp .env.production.example .env && nano .env"
echo ""
echo "   2. Loyihani ishga tushiring:"
echo "      cd $PROJECT_DIR && docker compose up -d --build"
echo ""
echo "   3. pgAdmin (DB boshqarish):"
echo "      http://$DOMAIN:5050"
echo ""
echo "   4. Telegram webhook o'rnating:"
echo "      curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://$DOMAIN/api/telegram/webhook"
echo ""
echo -e "${GREEN}🔄 Yangilash uchun:${NC}"
echo "   cd $PROJECT_DIR && bash deploy_update.sh"
echo ""
