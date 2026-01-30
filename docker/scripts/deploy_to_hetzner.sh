#!/usr/bin/env bash
set -euo pipefail

# Usage:
# SSH_USER=user SSH_HOST=1.2.3.4 ./scripts/deploy_to_hetzner.sh /opt/alif24

REMOTE_DIR=${1:-/opt/alif24}
SSH_USER=${SSH_USER:-}
SSH_HOST=${SSH_HOST:-}

if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ]; then
  echo "Specify SSH_USER and SSH_HOST environment variables. Example: SSH_USER=root SSH_HOST=1.2.3.4 $0"
  exit 2
fi

echo "Deploying to ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}"

ssh ${SSH_USER}@${SSH_HOST} "sudo mkdir -p ${REMOTE_DIR} && sudo chown ${SSH_USER}:${SSH_USER} ${REMOTE_DIR}"

scp docker-compose.prod.yml ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/docker-compose.yml
scp deploy/nginx.prod.conf ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/nginx.prod.conf

if [ -f .env.production ]; then
  scp .env.production ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/.env.production
else
  echo ".env.production not found locally — create it from .env.production.example and fill values before running this script.";
fi

echo "Files copied. Now running remote compose pull & up"
ssh ${SSH_USER}@${SSH_HOST} "cd ${REMOTE_DIR} && sudo mv nginx.prod.conf /etc/nginx/conf.d/alif24.conf || true && \
  docker compose pull || true && docker compose up -d --remove-orphans"

echo "Deployment commands executed.\nOn the server, obtain Let's Encrypt certificates (example):\n  sudo mkdir -p /var/www/certbot && sudo chown -R ${SSH_USER}:${SSH_USER} /var/www/certbot\n  sudo docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot certbot/certbot certonly --webroot -w /var/www/certbot -d example.com -d www.example.com --email you@example.com --agree-tos"

echo "After certs are created, restart proxy with: sudo docker compose restart proxy || sudo docker compose up -d proxy"
