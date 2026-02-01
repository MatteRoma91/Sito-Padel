#!/bin/bash
# Deploy script per Padel Tour
# Uso: chmod +x scripts/deploy.sh && ./scripts/deploy.sh

set -e

echo "=== Deploy Padel Tour ==="

cd /home/ubuntu/Sito-Padel

# Install dependencies
echo ">>> Installazione dipendenze..."
npm ci --production=false

# Build
echo ">>> Build applicazione..."
npm run build

# Install PM2 globally if not present
if ! command -v pm2 &>/dev/null; then
    echo ">>> Installazione PM2..."
    sudo npm install -g pm2
fi

# Stop existing instance
echo ">>> Stop istanza esistente..."
pm2 stop padel-tour 2>/dev/null || true
pm2 delete padel-tour 2>/dev/null || true

# Start with PM2
echo ">>> Avvio con PM2..."
pm2 start ecosystem.config.js

# Save PM2 list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

echo ""
echo "=== Deploy completato ==="
echo "Sito: http://localhost:3000"
echo ""
echo "Comandi utili:"
echo "  pm2 status        - stato"
echo "  pm2 logs          - log"
echo "  pm2 restart all   - riavvio"
