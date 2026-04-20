# Guida Server – Banana Padel Tour

> **Nota**: Questo file non è servito dal sito (non è in `/public`). È una guida operativa da aggiornare man mano che si effettuano modifiche.

**Siti sul server**: bananapadeltour.duckdns.org (:3000) · ibuche.duckdns.org (:3001) · gestione-veicoli.duckdns.org (:3002) · matteroma.duckdns.org (:3005 Control Room)
**Server**: VPS (OVH), IP pubblico 57.131.40.170
**Utente**: ubuntu (con sudo)
**SO**: Ubuntu 24.04 LTS

**Documentazione correlata**: [README.md](README.md) (overview, installazione, PWA) · [docs/DEPLOY-PRODUZIONE.md](docs/DEPLOY-PRODUZIONE.md) (setup completo produzione) · [docs/WEBSOCKET-CHAT.md](docs/WEBSOCKET-CHAT.md) (chat interna + Live Score) · [docs/CENTRO-SPORTIVO.md](docs/CENTRO-SPORTIVO.md) (centro sportivo) · [docs/LEZIONI.md](docs/LEZIONI.md) (lezioni e carnet) · [docs/SEO.md](docs/SEO.md) (SEO tecnica) · [docs/SECURITY-REPORT.md](docs/SECURITY-REPORT.md) (sicurezza backend/DB) · [docs/REPORT-COMPARATIVO.md](docs/REPORT-COMPARATIVO.md) (ottimizzazione performance) · [NOTIFICHE-CONTESTO.md](NOTIFICHE-CONTESTO.md) (piano notifiche push) · [docs/archive/](docs/archive/) (storico)

---

## Architettura (entrambi i siti)

```
Utente → DuckDNS → Nginx (:443/:80) ─┬→ bananapadeltour   → padel-tour (Next.js + Socket.io) :3000 → SQLite
                                     ├→ ibuche           → roma-buche (Next.js standalone) :3001 → SQLite
                                     ├→ gestione-veicoli → gestione-veicoli (Next.js) :3002 → SQLite + uploads
                                     └→ matteroma        → control-room (Express) :3005 → settings.json
```

**Stack server attuale** (aggiornato 10 marzo 2026):

| Componente | Versione | Note |
|-----------|----------|------|
| Ubuntu | 24.04 LTS | kernel 6.8.0-101 |
| Node.js | 22.22.0 LTS | via nvm, EOL aprile 2027 |
| npm | 10.9.4 | |
| Next.js | 16.2.3 | Sito-Padel, Roma-Buche, Gestione-Veicoli, Gestione-Casa |
| React | 19 | entrambe le app |
| PM2 | 6.0.14 | con modulo pm2-logrotate |
| Nginx | 1.24.0 | reverse proxy + gzip + SSL |
| Certbot | Let's Encrypt | rinnovo automatico con hook Nginx reload |
| UFW | attivo | porte aperte: 22/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS) |
| Swap | 2 GB | `/swapfile`, attivo permanente in `/etc/fstab` |

**Conflitti evitati**: ogni sito ha `server_name` e porta univoci. Per aggiornare Nginx: `sudo ./scripts/update-nginx.sh` (copia entrambe le config).

---

## Avvio dopo un riavvio del server

PM2 è configurato con `pm2 startup` (servizio systemd `pm2-ubuntu.service`): al boot riavvia automaticamente le app salvate con `pm2 save`. Normalmente non serve intervento manuale.

Se il riavvio automatico non funziona:

1. **Nginx**: `sudo systemctl start nginx` (o `restart`)
2. **Entrambe le app**: avvia PM2 dalla config centralizzata (`pm2 start ~/ecosystem.config.js`)
3. **Salva PM2**: `pm2 save`

I passaggi sopra sostituiscono il vecchio runbook separato.

---

## Variabili d'ambiente (produzione)

In `/home/ubuntu/Sito-Padel` è presente un file `.env` (non in git) con:

| Variabile | Uso |
|-----------|-----|
| `SESSION_SECRET` | Segreto per cookie di sessione (64 caratteri, casuale) |
| `DATABASE_PATH` | Percorso del database SQLite (default: `data/padel.db`) |
| `PORT` | Porta su cui ascolta l'app (default: 3000) |
| `NEXT_PUBLIC_SITE_URL` | URL pubblico (SEO, PWA) |
| `NODE_ENV` | PM2 imposta `production` in `ecosystem.config.js` |

Dopo aver modificato `.env`, riavviare l'app: `pm2 restart padel-tour`.

---

## Gestione Node.js con nvm

Node.js è gestito tramite **nvm** (Node Version Manager), installato il 28 febbraio 2026.

```bash
# Versione attuale
node -v   # v22.22.0
nvm current

# Installare una nuova versione LTS
nvm install --lts
nvm alias default <versione>

# Dopo cambio versione, reinstallare i pacchetti globali
npm install -g pm2
pm2 update

# Rebuild e restart delle app
cd /home/ubuntu/Sito-Padel && npm rebuild && npm run build && pm2 restart padel-tour
cd /home/ubuntu/Roma-Buche && npm rebuild && npm run build && pm2 restart roma-buche
pm2 save
```

---

## Firewall (UFW)

Il firewall UFW è attivo dal 28 febbraio 2026.

```bash
sudo ufw status          # Mostra stato e regole
# Porte aperte: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

Non aprire porte aggiuntive a meno che non sia strettamente necessario. Le app Node ascoltano su `localhost:3000` e `localhost:3001`, raggiungibili solo tramite Nginx.

---

## Swap

Il server ha un file swap di 2 GB per evitare OOM (Out of Memory) su VPS con RAM limitata.

```bash
swapon --show   # Verifica swap attivo
free -h         # Mostra RAM e swap
```

Lo swap è configurato permanentemente in `/etc/fstab`.

---

## Certificati SSL (Let's Encrypt)

I certificati sono gestiti da Certbot con rinnovo automatico. Alla scadenza e rinnovo, un hook in `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` esegue `systemctl reload nginx` per caricare il nuovo certificato senza downtime.

```bash
sudo certbot certificates      # Stato e scadenza certificati
sudo certbot renew --dry-run   # Test rinnovo
```

---

## Log rotation (PM2)

Il modulo `pm2-logrotate` è installato e configurato:

```bash
pm2 get pm2-logrotate          # Mostra configurazione attuale
# max_size: 10M, retain: 7 file, compress: true
```

I log PM2 non cresceranno oltre 70 MB totali (7 file × 10 MB).

---

## Cronologia interventi

### 1. Verifica iniziale (1 febbraio 2026)

**Obiettivo**: Verificare che tutti i processi necessari al funzionamento del sito fossero attivi.

**Componenti verificati**:

| Componente     | Stato iniziale    | Azione eseguita                          |
|----------------|-------------------|------------------------------------------|
| Nginx          | Attivo            | Nessuna                                  |
| PM2/padel-tour | Non avviato       | `pm2 start ecosystem.config.js`          |
| Porta 3000     | Non in ascolto    | Avviata con PM2                          |
| DNS DuckDNS    | OK                | Risolve a 57.131.40.170                  |
| Certificato SSL| Valido            | Let's Encrypt, rinnovo automatico        |
| Database       | Presente          | `/home/ubuntu/Sito-Padel/data/padel.db`  |

**Comandi eseguiti**:
```bash
cd /home/ubuntu/Sito-Padel && pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

### 2. Limite upload Nginx – `client_max_body_size` (1 febbraio 2026)

**Problema**: Nginx rifiutava upload avatar > 1MB con errore "client intended to send too large body".

**Soluzione**: Impostato `client_max_body_size 25M` nella configurazione Nginx.

**Nota**: L'app Next.js limita gli avatar a 5MB. Per la **Galleria** (video fino a 500MB), se necessario: `client_max_body_size 550M;`.

---

### 3. Miglioramento contrasto testo (1 febbraio 2026)

**Problema**: Testo secondario poco leggibile (troppo chiaro) nelle pagine Tornei, Giocatori, Classifiche.

**Soluzione**: Sostituzione di `text-slate-600` con `text-slate-700` e `dark:text-slate-600` con `dark:text-slate-400` per migliorare il contrasto (WCAG).

---

### 4. Ricalcolo colori per leggibilità globale (1 febbraio 2026)

**Problema**: Testo illeggibile in dark mode (es. valori bianchi su card bianche).

**Soluzione**: Sfondo dark card `dark:bg-primary-900/80`, input `dark:bg-primary-800/50`, testo `dark:text-slate-100/300`.

---

### 5. Palette Blu-Lime esplicita (1 febbraio 2026)

**Obiettivo**: Applicare la palette (blu reale #3445F1, lime neon #B2FF00, bianco #FFFFFF, blu secondari #6270F3 e #9AB0F8).

---

### 6. PWA / Offline Mode (20 febbraio 2026)

**Implementazione**: Serwist (Service Worker), manifest.ts, caching differenziato (stale-while-revalidate per dati, cache-first per asset), pagina offline, banner aggiornamento.

---

### 7. Chat interna, Live Score e WebSocket/Socket.io (20 febbraio 2026)

**Architettura**: Custom server (`server.js` + Socket.io) su porta 3000. PM2 con `instances: 1` per room WebSocket.

Dettagli: [docs/WEBSOCKET-CHAT.md](docs/WEBSOCKET-CHAT.md).

---

### 8. Ottimizzazioni frontend e PWA avanzata (20 febbraio 2026)

Dynamic import, code splitting, bundle analyzer, immagini AVIF/WebP.

Dettagli: [docs/REPORT-COMPARATIVO.md](docs/REPORT-COMPARATIVO.md).

---

### 9. Galleria immagini e video (26 febbraio 2026)

- Voce di menu **Galleria** (`/gallery`): tutti possono caricare immagini e video; solo admin può eliminare.
- Limite totale: 20 GB; immagini max 10 MB, video max 500 MB.
- Storage: `public/gallery/`; backup completo include la cartella nello ZIP.

---

### 10. Ottimizzazione RAM (28 febbraio 2026)

- PM2: `max_memory_restart` 400M, `NODE_OPTIONS: --max-old-space-size=384`
- Next.js: `preloadEntriesOnStart: false`, `productionBrowserSourceMaps: false`
- Nginx: `keepalive 16` (era 64)

---

### 11. Review e hardening completo (28 febbraio 2026)

**Interventi critici**:

- **Roma-Buche – crash loop (23 restart)**: La pagina `/logout` era un Server Component che chiamava `session.destroy()` (modifica cookie non consentita). Convertita a Client Component con fetch a `/api/auth/logout`.
- **Roma-Buche – errore SQLite**: Query `getBlockedAttempts()` usava double quotes `""` per stringa vuota (SQLite le interpreta come identificatori). Corretto con single quotes `''`.
- **Sito-Padel – refactoring `server.js`**: Rimossa dipendenza da `url.parse()` (deprecato). Estratta migrazione chat in `lib/db/chat-migration.js`. Creato `lib/db/chat-queries-server.js` (modulo CommonJS per server.js, che non può fare require di TypeScript).
- **Health check endpoints**: Creati `/api/health` su entrambe le app (verifica DB, risposta JSON).
- **Rate limit cleanup**: Aggiunto `setInterval` per pulizia periodica delle entry scadute nella Map del rate limiter (previene memory leak).

**Hardening server**:

- Firewall UFW attivato (22, 80, 443)
- Swap 2 GB creato (`/swapfile`)
- `pm2-logrotate` installato (10M, 7 file, compressione)
- Hook Certbot per reload Nginx dopo rinnovo certificato

**Nginx ottimizzato**:

- `proxy_set_header Connection "";` nei blocchi non-WebSocket (abilita upstream keepalive)
- Security headers aggiunti su Roma-Buche (`next.config.mjs`)

---

### 12. Aggiornamento stack (28 febbraio 2026)

**Aggiornamenti effettuati**:

| Componente | Prima | Dopo |
|-----------|-------|------|
| Pacchetti Ubuntu | ~40 arretrati | Tutti aggiornati |
| Kernel | 6.8.0-100 | 6.8.0-101 (attivato con reboot) |
| Node.js | 20.20.0 | 22.22.0 LTS (via nvm) |
| npm | 10.8.2 | 10.9.4 |
| Next.js | 14.2.35 | 15.5.12 → 16.2.3 |
| React | 18 | 19 |
| react-leaflet (Roma-Buche) | 4.2.1 | 5.0.0 |
| framer-motion | 11 | 12 |
| eslint-config-next | 14.x | 16.x |
| Tailwind CSS | 3.x | 4.x |
| ESLint | 8.x | 9.x (flat config) |

**Adattamenti per Next.js 15**:

- `ssr: false` con `next/dynamic` non è più consentito nei Server Components. Creati wrapper Client Component: `ExportPdfButtonLazy.tsx`, `ChatLayoutLazy.tsx`, `MapWithSearchLazy.tsx`.
- Risolto naming conflict `dynamic` (export const vs import) in `profiles/[id]/page.tsx`.
- Risolto errore "bind" in Sito-Padel (causato da bug in Next.js 14, risolto in 15).

**Adattamenti per Next.js 16 + Tailwind 4 + ESLint 9 (apr 2026)**:

- Rimossi `experimental.preloadEntriesOnStart` e `experimental.serverSourceMaps` (deprecati).
- Aggiunto `turbopack: {}` in `next.config.mjs` per compatibilità con serwist webpack config.
- Roma-Buche: build forzata con `--webpack` perché leaflet-defaulticon-compatibility usa la sintassi CSS `~` (webpack-only).
- ESLint: `.eslintrc.json` sostituito da `eslint.config.mjs` con FlatCompat in tutte e 3 le app.
- Tailwind: `tailwind.config.ts` eliminato; tema traslato in `@theme inline` dentro `globals.css`; `autoprefixer` rimosso (Gestione-Veicoli).
- Fix build: in ambiente con `NODE_ENV=production` le devDependencies non vengono installate → usare `NODE_ENV=development npm install --include=dev`. La build di Sito-Padel richiedeva `unset DATABASE_PATH` per evitare che il processo leggesse il DB di scoutbet-pro dall'environment del server.

---

### 13. Centro sportivo e account Guest (marzo 2026)

**Centro sportivo (Sito-Padel)**:

- Nuova sezione **Centro sportivo** (`/sports-center`): griglia giorno × campi × slot (30 min), prenotazioni 60 o 90 min con nome prenotazione e celle unificate; pagina partita (`/sports-center/bookings/[id]`) per assegnare 4 partecipanti (utenti del sito).
- Tabelle DB: `courts`, `court_bookings` (con `booking_name`), `court_booking_participants`, `center_closed_slots`. Config in `site_config`: `court_open_time`, `court_close_time`, `court_allowed_durations`.
- API: `GET/POST /api/sports-center/courts`, `GET/PATCH/DELETE /api/sports-center/courts/[id]`, `GET /api/sports-center/availability`, `GET/POST/PATCH/DELETE` bookings, `GET/PUT /api/sports-center/closed-slots` (solo admin).
- Impostazioni → tab **Centro sportivo**: orari apertura/chiusura, durate 60/90 min, slot di chiusura (fasce non prenotabili), gestione campi (CRUD).

**Ruolo Guest**:

- Ruolo `guest` in `users.role` (migrazione schema): navigazione in sola lettura (tornei, profili, classifiche, galleria, chat, centro sportivo). Nessun pulsante Crea/Modifica/Elimina; API POST/PATCH/DELETE ritornano 403 per guest. Impostazioni nascoste al guest. Creazione utente guest da Impostazioni → Utenti.

---

### 14. Ottimizzazione server (10 marzo 2026)

**Modifiche effettuate**:

| Area | Modifica |
|------|----------|
| **PM2** | Configurazione centralizzata in `~/ecosystem.config.js` (non più per-app). Limiti memoria: padel-tour 512M, roma-buche 768M, control-room 256M |
| **Roma-Buche** | Output `standalone` in Next.js; PM2 avvia `server.js` da `.next/standalone/`. Build copia automaticamente `.next/static` e `public` |
| **Sito-Padel** | Nessun standalone (custom server + Socket.io incompatibile). SQLite: PRAGMA `synchronous=NORMAL`, `cache_size=-20000`, `busy_timeout=5000` |
| **Nginx** | `worker_rlimit_nofile 65535`, `worker_connections 1024`, gzip completo, rate limiting su `/api/`, `location = /sw.js` no-cache per Ibuche (PWA), upstream keepalive per Control Room |
| **Kernel** | sysctl: somaxconn, tcp_tw_reuse, tcp_fin_timeout, tcp_rmem/wmem, file-max. limits.conf: nofile 65535 per ubuntu |
| **pm2-logrotate** | retain 7, workerInterval 30 |
| **Health check** | Cron `*/5 * * * *` esegue `~/scripts/health-check.sh` (verifica padel e buche, riavvia se non rispondono). Log: `/var/log/health-check.log` |
| **Backup SQLite** | Cron 03:00 backup `padel.db` in `~/backups/`, 04:00 elimina backup >7 giorni |

**Avvio PM2**: `pm2 start ~/ecosystem.config.js` (non più da singole directory).

---

## Pacchetti/servizi installati (ordine indicativo)

1. **nvm** – gestione versioni Node.js
2. **Node.js 22 LTS** (via nvm) – runtime per le app Next.js
3. **npm 10** – gestione dipendenze
4. **Nginx 1.24** – reverse proxy, gzip, SSL, HTTP/2
5. **Certbot** – certificati Let's Encrypt (rinnovo automatico + hook reload Nginx)
6. **PM2 6** (globale) – process manager con `pm2-logrotate`
7. **UFW** – firewall (porte 22, 80, 443)
8. **DNS DuckDNS** – domini bananapadeltour/ibuche.duckdns.org → IP del server

---

## File di configurazione principali

| File                         | Ruolo                                   |
|-----------------------------|-----------------------------------------|
| `/etc/nginx/sites-available/padel-tour` | Config Nginx per bananapadeltour |
| `/etc/nginx/sites-available/ibuche` | Config Nginx per ibuche |
| `/etc/nginx/sites-available/matteroma.duckdns.conf` | Config Nginx per Control Room |
| `/home/ubuntu/ecosystem.config.js` | **Config PM2 centralizzata** (padel-tour, roma-buche, gestione-veicoli, control-room) |
| `/home/ubuntu/control-room/settings.json` | Runtime Control Room (webhook/notifiche, **filtri notifiche per processo PM2**, whitelist IP, 2FA; non committare segreti). Documentazione: `control-room/README.md` |
| `server.js`                 | Custom server Node (Next.js + Socket.io) |
| `.env`                      | Variabili d'ambiente (non in git) |
| `.env.example`              | Template variabili d'ambiente |
| `lib/db/chat-migration.js`  | Migrazione tabelle chat |
| `lib/db/chat-queries-server.js` | Query chat per server.js (CommonJS) |
| `scripts/deploy.sh`         | Script di deploy |
| `scripts/update-nginx.sh`   | Aggiornamento config Nginx entrambi i siti |
| `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` | Hook rinnovo certificati |
| `/home/ubuntu/scripts/backup-snapshot.py` | Snapshot consistenti (SQLite + upload/config) per app |
| `/home/ubuntu/scripts/restore-snapshot.sh` | Restore/rollback da snapshot (supporta `--dry-run`) |

---

## Backup e ripristino

- **Backup completo**: Impostazioni → Strumenti → **Scarica backup completo**. Scarica un ZIP con database, avatar e galleria. Conservare il file fuori dal server (PC, cloud).
- **Backup solo database**: stesso menu, **Scarica backup** (file `.db`).
- **Snapshot server (consigliato)**: per backup/rollback coerente con WAL e includendo upload/config:
  - `python3 /home/ubuntu/scripts/backup-snapshot.py --app all --include-pm2-dump`
  - Restore singola app: `bash /home/ubuntu/scripts/restore-snapshot.sh --app <nome> --stamp <STAMP> --dry-run` (verifica) / senza `--dry-run` (restore reale)

**Ripristino su nuovo server** (dopo crash o migrazione):

1. Clonare/copiare l'applicazione, `npm install`, configurare `.env` (e `DATABASE_PATH` se diverso da `data/padel.db`).
2. Copiare il file `padel-full-backup-*.zip` sul server.
3. Fermare l'app: `pm2 stop padel-tour`.
4. Eseguire: `node scripts/restore-backup.mjs /path/to/padel-full-backup-*.zip`.
5. Riavviare l'app: `pm2 start padel-tour`.

Eseguire lo script di ripristino preferibilmente con l'app ferma per evitare corruzione del database.

---

## Comandi utili

```bash
# Stato servizi
sudo systemctl status nginx
pm2 status

# Log
pm2 logs padel-tour
pm2 logs roma-buche
sudo tail -f /var/log/nginx/error.log

# Riavvio
pm2 restart padel-tour
pm2 restart roma-buche
sudo systemctl reload nginx

# Deploy (build + restart PM2)
cd /home/ubuntu/Sito-Padel && ./scripts/deploy.sh

# Health check
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health

# Node.js (nvm)
node -v
nvm current
nvm ls

# Firewall
sudo ufw status

# Swap e RAM
free -h
swapon --show

# Certificati SSL
sudo certbot certificates
```

---

## Risoluzione problemi

- **Sito non risponde dopo riavvio**
  PM2 dovrebbe riavviare le app automaticamente (servizio `pm2-ubuntu.service`). Se non funziona: `sudo systemctl start nginx`, poi `pm2 start ~/ecosystem.config.js` o `pm2 restart padel-tour roma-buche control-room`, infine `pm2 save`.

- **Errore "Could not find a production build" o "MODULE_NOT_FOUND" nei log PM2**
  Build mancante o corrotta. In `/home/ubuntu/Sito-Padel` eseguire `npm run build`, poi `pm2 restart padel-tour`.

- **Verifica che l'app risponda**
  `curl http://localhost:3000/api/health` → atteso `{"status":"ok"}`.
  `ss -tlnp | grep 3000` → deve mostrare il processo in ascolto sulla porta 3000.

- **PWA / Service Worker**
  HTTPS obbligatorio. Dopo deploy, il nuovo `sw.js` è generato da `next build`; nessuna modifica Nginx necessaria. Verifica: Chrome DevTools → Application → Service Workers.

- **Node.js non trovato dopo login SSH**
  Verificare che nvm sia caricato: `source ~/.bashrc` oppure `nvm use default`.
