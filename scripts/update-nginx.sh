#!/bin/bash
# Aggiorna le configurazioni Nginx per ENTRAMBI i siti (bananapadeltour + ibuche)
# Evita conflitti: usa sempre questo script quando modifichi i file .conf
# Uso: sudo ./scripts/update-nginx.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITO_PADEL="$(dirname "$SCRIPT_DIR")"
ROMA_BUCHE="/home/ubuntu/Roma-Buche"

echo "=== Aggiornamento Nginx (bananapadeltour + ibuche) ==="

# Verifica che i file esistano
[ -f "$SITO_PADEL/scripts/nginx-padel.conf" ] || { echo "Errore: nginx-padel.conf non trovato"; exit 1; }
[ -f "$ROMA_BUCHE/scripts/nginx-ibuche.conf" ] || { echo "Errore: nginx-ibuche.conf non trovato"; exit 1; }

# Copia configurazioni
echo ">>> Copia padel-tour..."
cp "$SITO_PADEL/scripts/nginx-padel.conf" /etc/nginx/sites-available/padel-tour

echo ">>> Copia ibuche..."
cp "$ROMA_BUCHE/scripts/nginx-ibuche.conf" /etc/nginx/sites-available/ibuche

# Symlink (se non esistono)
ln -sf /etc/nginx/sites-available/padel-tour /etc/nginx/sites-enabled/padel-tour 2>/dev/null || true
ln -sf /etc/nginx/sites-available/ibuche /etc/nginx/sites-enabled/ibuche 2>/dev/null || true

# Test e reload
echo ">>> Test configurazione..."
nginx -t

echo ">>> Reload Nginx..."
systemctl reload nginx

echo ""
echo "=== Nginx aggiornato ==="
echo "  - bananapadeltour.duckdns.org (porta 3000)"
echo "  - ibuche.duckdns.org (porta 3001)"
