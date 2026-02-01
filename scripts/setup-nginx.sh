#!/bin/bash
# Setup Nginx come reverse proxy
# Uso: chmod +x scripts/setup-nginx.sh && sudo ./scripts/setup-nginx.sh

set -e

echo "=== Setup Nginx ==="

# Install Nginx
apt update
apt install -y nginx

# Copy config
cp /home/ubuntu/Sito-Padel/scripts/nginx-padel.conf /etc/nginx/sites-available/padel-tour

# Enable site
ln -sf /etc/nginx/sites-available/padel-tour /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Test config
nginx -t

# Reload Nginx
systemctl reload nginx
systemctl enable nginx

echo ""
echo "=== Nginx configurato ==="
echo "Sito raggiungibile su: http://bananapadeltour.duckdns.org"
