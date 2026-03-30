# Deploy Produzione - Sito Padel

Configurazione pronta per produzione con PM2, Nginx, SSL, security headers e health check.

**Stack attuale**: Node.js 22 LTS (via nvm) · Next.js 15 · React 19 · PM2 6 · Nginx 1.24

---

## 1. PM2 (configurazione centralizzata)

Le app del server sono gestite da una **configurazione PM2 centralizzata** in `/home/ubuntu/ecosystem.config.js`:

- `padel-tour` (3000)
- `roma-buche` (3001)
- `gestione-veicoli` (3002)
- `scommesse` (3003)
- `control-room` (3005)

Il server padel-tour usa **`server.js`** (custom server Node + Socket.io) invece di `next start`. Per evitare problemi con le room WebSocket, PM2 usa **una sola istanza** per app (`instances: 1`).

### Avvio iniziale
```bash
cd /home/ubuntu/Sito-Padel
npm run build
pm2 start /home/ubuntu/ecosystem.config.js
pm2 save
pm2 startup  # esegui il comando suggerito per avvio al boot
```

### Log rotation (già installato)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 30
```

### Comandi utili
```bash
pm2 status
pm2 logs padel-tour
pm2 monit
pm2 restart padel-tour
```

### Health check
```bash
curl http://localhost:3000/api/health
# Atteso: {"status":"ok","timestamp":"..."}
# In caso di errore DB: {"status":"error","error":"..."}  (HTTP 503)
```

---

## 2. Nginx (reverse proxy + WebSocket + SSL)

### Setup
```bash
sudo cp /home/ubuntu/Sito-Padel/scripts/nginx-padel.conf /etc/nginx/sites-available/padel-tour
sudo ln -sf /etc/nginx/sites-available/padel-tour /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Oppure usa lo script unificato (aggiorna entrambi i siti): `sudo ./scripts/update-nginx.sh`

Il file `scripts/nginx-padel.conf` è configurato per:

- **Galleria** (video fino a 500MB): `client_max_body_size` impostato nel blocco server;
- inoltrare il traffico HTTP/HTTPS verso `http://localhost:3000` (server Node custom);
- gestire correttamente le connessioni **WebSocket** (chat interna e Live Score) con gli header:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
```

- **upstream keepalive**: `keepalive 16` con `proxy_set_header Connection "";` nei blocchi non-WebSocket per connessioni persistenti Node ↔ Nginx;
- **gzip** su JSON, JS, CSS, font, SVG, XML;
- **cache statici**: `/_next/static/` 1 anno, immagini/font 1 giorno;
- **security headers**: X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy.

Per dettagli su eventi Socket.io e API REST vedere [docs/WEBSOCKET-CHAT.md](WEBSOCKET-CHAT.md).

### SSL + HTTP/2 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bananapadeltour.duckdns.org
```

Il rinnovo è automatico. Un hook in `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` esegue `systemctl reload nginx` dopo ogni rinnovo.

Con SSL attivo:

- la PWA (Service Worker, manifest) funziona correttamente;
- le connessioni WebSocket passano in **wss://** tramite Nginx.

### Firewall (UFW)
```bash
sudo ufw status
# Porte aperte: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

Le app Node ascoltano su `localhost:3000/3001`, non sono esposte direttamente.

---

## 3. server.js – Architettura

Il custom server (`server.js`) gestisce:

1. **Next.js request handler** – tutte le richieste HTTP passano a `handle(req, res)`
2. **Socket.io** – WebSocket per chat e live score
3. **Migrazione chat** – `runChatMigration()` all'avvio

Moduli di supporto:

| File | Ruolo |
|------|-------|
| `lib/db/chat-migration.js` | Migrazione tabelle chat (CommonJS) |
| `lib/db/chat-queries-server.js` | Query chat per server.js (CommonJS, non usa TypeScript) |
| `lib/socket.js` | Configurazione Socket.io |

I `require()` dei moduli chat vengono eseguiti **dentro** `app.prepare().then()` per garantire che Next.js abbia completato la compilazione.

---

## 4. Variabili d'ambiente

| Variabile | Obbligatorio | Dettaglio |
|-----------|:---:|-----------|
| `SESSION_SECRET` | **Sì** | Segreto sessione, min 32 caratteri (64 consigliato) |
| `DATABASE_PATH` | No | Default `data/padel.db` |
| `PORT` | No | Default `3000` |
| `NEXT_PUBLIC_SITE_URL` | No | URL pubblico per SEO e PWA |

File `.env.example` incluso nel repository come template.

---

## 5. Riepilogo configurazione

| Componente        | Dettaglio                                              |
|-------------------|--------------------------------------------------------|
| PM2               | Config centralizzata `/home/ubuntu/ecosystem.config.js`. `instances: 1` per app (WebSocket richiede processo singolo) |
| PM2 padel-tour    | `max_memory_restart: 512M`, `node_args: --max-old-space-size=512` |
| PM2 roma-buche    | `max_memory_restart: 768M`, avvio da `.next/standalone/server.js` |
| PM2 control-room  | `max_memory_restart: 256M` |
| PM2 restart       | `autorestart: true`, `restart_delay: 5000`, `max_restarts: 15` |
| PM2 log rotation  | `pm2-logrotate` (10M, 7 file, compressione, workerInterval 30) |
| Nginx gzip        | Tipi: json, js, css, fonts, svg, xml                   |
| Nginx HTTP/2      | Con SSL (dopo certbot)                                 |
| Nginx keepalive   | 16 connessioni, `Connection ""` su blocchi non-WS      |
| Nginx cache       | `/_next/static/` 1 anno, immagini/font 1 giorno       |
| Security headers  | X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy |
| Firewall UFW      | 22 (SSH), 80 (HTTP), 443 (HTTPS)                      |
| Swap               | 2 GB `/swapfile`                                       |
| SSL                | Let's Encrypt, rinnovo automatico + reload hook        |
| Node.js            | 22 LTS via nvm                                        |
| Health check       | `/api/health` – verifica DB, JSON response. Script server: `/home/ubuntu/scripts/health-check.sh` (controlla tutte le webapp e riavvia solo se endpoint locale KO; notifiche lette da `control-room/settings.json`) |
| SQLite (padel)     | PRAGMA: journal_mode=WAL, synchronous=NORMAL, cache_size=-20000, busy_timeout=5000 |
| Backup / rollback  | Snapshot consistenti (SQLite + upload/config) tramite `/home/ubuntu/scripts/backup-snapshot.py` e restore tramite `/home/ubuntu/scripts/restore-snapshot.sh` |
