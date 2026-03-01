#!/bin/bash
# Post-boot health check e auto-recovery per padel-tour e roma-buche.
# Se un'app non risponde all'health check dopo il reboot, rifa la build e riavvia.
# Uso: ./scripts/post-boot-check.sh (anche come servizio systemd)

set -e

SITO_PADEL="/home/ubuntu/Sito-Padel"
ROMA_BUCHE="/home/ubuntu/Roma-Buche"
export PATH="/home/ubuntu/.nvm/versions/node/v22.22.0/bin:$PATH"

log() { echo "[$(date -Iseconds)] $*"; }

# Attendi che PM2 abbia processi online e che Next.js sia avviato (max ~90s)
log "Attesa avvio PM2 e app..."
for i in $(seq 1 30); do
  if pm2 status 2>/dev/null | grep -q "online"; then
    break
  fi
  sleep 2
done
# Next.js richiede qualche secondo extra per essere "Ready"
sleep 15

recovered=0

# Health check roma-buche (porta 3001)
if ! curl -sf --connect-timeout 5 http://localhost:3001/api/health >/dev/null 2>&1; then
  log "roma-buche non risponde: rifaccio build e riavvio..."
  cd "$ROMA_BUCHE"
  npm run build
  pm2 restart roma-buche
  pm2 save
  recovered=1
  log "roma-buche ripristinata."
else
  log "roma-buche OK."
fi

# Health check padel-tour (porta 3000)
if ! curl -sf --connect-timeout 5 http://localhost:3000/api/health >/dev/null 2>&1; then
  log "padel-tour non risponde: rifaccio build e riavvio..."
  cd "$SITO_PADEL"
  npm run build
  pm2 restart padel-tour
  pm2 save
  recovered=1
  log "padel-tour ripristinato."
else
  log "padel-tour OK."
fi

[ $recovered -eq 1 ] && pm2 save
log "Post-boot check completato."
