#!/bin/bash
# Setup HTTPS con Certbot
# Uso: chmod +x scripts/setup-https.sh && sudo ./scripts/setup-https.sh

set -e

echo "=== Setup HTTPS con Certbot ==="

# Install Certbot
apt update
apt install -y certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d bananapadeltour.duckdns.org --non-interactive --agree-tos --email admin@example.com --redirect

# Test renewal
certbot renew --dry-run

echo ""
echo "=== HTTPS configurato ==="
echo "Sito raggiungibile su: https://bananapadeltour.duckdns.org"
echo ""
echo "Il certificato si rinnova automaticamente."
