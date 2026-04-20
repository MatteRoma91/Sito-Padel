# Banana Padel Tour

Sito privato per la gestione di tornei di padel con chat, live score, galleria e PWA.

---

## Indice

- [Documentazione](#documentazione)
- [Funzionalità](#funzionalità)
- [Tecnologie](#tecnologie)
- [Installazione](#installazione)
- [Deploy](#deploy-su-ubuntu)
- [Backup](#backup-e-ripristino)
- [PWA](#pwa--installazione-come-app)
- [Risoluzione problemi](#risoluzione-problemi)

---

## Documentazione

| File | Contenuto |
|------|-----------|
| **[GUIDA-SERVER.md](GUIDA-SERVER.md)** | Guida operativa server: architettura, cronologia interventi, backup, PWA, troubleshooting |
| **[docs/DEPLOY-PRODUZIONE.md](docs/DEPLOY-PRODUZIONE.md)** | Setup produzione con PM2, Nginx, SSL, log rotation e cache statici |
| **[docs/WEBSOCKET-CHAT.md](docs/WEBSOCKET-CHAT.md)** | Chat interna, Live Score, server WebSocket/Socket.io e API REST correlate |
| **[docs/CENTRO-SPORTIVO.md](docs/CENTRO-SPORTIVO.md)** | Centro sportivo: campi, prenotazioni, slot chiusura, pagina partita, API e Impostazioni |
| **[docs/LEZIONI.md](docs/LEZIONI.md)** | Lezioni e carnet: ruoli maestro/admin, richieste, timetable, timbro manuale, API |
| **[docs/SEO.md](docs/SEO.md)** | SEO tecnica: metadata, Open Graph, sitemap, robots, structured data |
| **[docs/SECURITY-REPORT.md](docs/SECURITY-REPORT.md)** | Sicurezza: indici DB, rate limit, validazione Zod, sessioni, firewall, password hashing |
| **[docs/REPORT-COMPARATIVO.md](docs/REPORT-COMPARATIVO.md)** | Confronto prima/dopo (performance, sicurezza, vulnerabilità npm) |
| **[docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md)** | Come eseguire Lighthouse e aggiornare i report in `docs/reports/` |
| **[NOTIFICHE-CONTESTO.md](NOTIFICHE-CONTESTO.md)** | Piano notifiche push Web Push (futuro) |
| **[docs/archive/](docs/archive/)** | Documenti storici e materiali non operativi correnti |

---

## Funzionalità

- **Autenticazione**: Login con username/password; ruoli **Admin**, **Maestro** (lezioni/carnet), **Giocatore** e **Guest** (sola lettura per demo/acquirenti)
- **Giocatori**: Gestione profili giocatori
- **Tornei**: Creazione e gestione tornei
- **Estrazione Coppie**: Algoritmo forte+debole per bilanciare le coppie
- **Tabellone**: Quarti, semifinali, finale + tabellone consolazione
- **Live Score**: Aggiornamento in tempo reale dei punteggi match tramite WebSocket
- **Classifiche**: Classifica torneo e classifica cumulativa
- **Calendario**: Vista calendario tornei
- **Export PDF**: Esportazione tabellone e classifica
- **Chat interna**: DM tra giocatori, chat di gruppo per torneo e chat broadcast; badge messaggi non letti e possibilità di eliminare messaggi (per admin)
- **Galleria**: Caricamento e visualizzazione di immagini e video (tutti possono caricare, solo admin può eliminare); limite totale 20 GB; gestione e spazio in Impostazioni
- **Centro sportivo**: Gestione campi e prenotazioni in stile Playtomic: griglia giorno/campi/slot (30 min), prenotazioni 60 o 90 min con **nome prenotazione** e celle unificate; pagina partita con assegnazione di 4 partecipanti (utenti del sito); admin configura da Impostazioni orari apertura/chiusura, durate consentite (60/90 min) e **slot di chiusura** (fasce non prenotabili); gestione campi (aggiungi/modifica/elimina). Visibile ad admin, guest (sola lettura) e giocatori (prenotano per sé; admin può prenotare anche per ospiti). **Lezioni** (carnet, richieste, timetable): menu **Lezioni** per admin, maestro e giocatori **con carnet** (`/lezioni`; i giocatori vedono solo i propri carnet); in **Prenota un campo** nessun blocco lezioni per i giocatori, solo scorciatoia staff verso `/lezioni`.
- **PWA / Offline**: Sito installabile come app su smartphone/tablet; caching intelligente (stale-while-revalidate per ranking e tornei, cache-first per asset statici); notifica quando è disponibile una nuova versione
- **Health Check**: Endpoint `/api/health` per monitoraggio esterno (verifica DB e risposta JSON)

## Tecnologie

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript 5
- Tailwind CSS 4
- SQLite (better-sqlite3, WAL mode)
- Socket.io (WebSocket per chat e live score)
- Serwist (PWA, Service Worker)
- iron-session (autenticazione cookie)
- Zod (validazione input)
- bcrypt (hashing password, 12 rounds)
- framer-motion 12 (animazioni)
- jsPDF (export PDF)
- sharp (ottimizzazione immagini)
- PM2 (process manager)
- Nginx (reverse proxy, gzip, HTTP/2, SSL)
- nvm (gestione versioni Node.js)
- Playwright (test end-to-end)
- Vitest (test unitari / integrazione)
- Lighthouse (analisi performance e SEO)

## Requisiti

- Node.js 22+ LTS (gestito tramite nvm)
- npm 10+

## Variabili d'ambiente

Copia `.env.example` in `.env` nella root (non committato).

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `SESSION_SECRET` | Segreto per la sessione (**obbligatorio** in produzione, min 32 caratteri) | fallback solo per sviluppo |
| `DATABASE_PATH` | Percorso del file SQLite | `data/padel.db` |
| `PORT` | Porta dell'app Node | `3000` |
| `NEXT_PUBLIC_SITE_URL` | URL pubblico del sito (per SEO e PWA) | `https://bananapadeltour.duckdns.org` |

In produzione `SESSION_SECRET` deve essere una stringa casuale lunga (64+ caratteri). Il file `.env.example` documenta tutte le variabili.

## Installazione

```bash
cd /home/ubuntu/Sito-Padel

npm install

npm run build

# Sviluppo (senza WebSocket)
npm run dev

# Sviluppo con WebSocket (chat + live score)
npm run dev:ws

# Produzione (avviato tramite PM2, vedi Deploy)
npm run start
```

## Deploy su Ubuntu

```bash
# 1. Deploy applicazione
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 2. Setup Nginx (richiede sudo)
chmod +x scripts/setup-nginx.sh
sudo ./scripts/setup-nginx.sh

# 3. Setup HTTPS (richiede sudo)
chmod +x scripts/setup-https.sh
sudo ./scripts/setup-https.sh
```

## Credenziali iniziali

Al primo avvio viene creato l'utente admin:

| Campo | Valore |
|-------|--------|
| **Username** | `admin` |
| **Password** | `admin123` |

> **Importante:** cambia la password dopo il primo login.

## Struttura Progetto

```
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Pagina login
│   ├── (dashboard)/        # Pagine protette
│   │   ├── tournaments/    # Gestione tornei
│   │   ├── profiles/       # Profili giocatori
│   │   ├── pairs/          # Estrazione coppie
│   │   ├── calendar/       # Calendario
│   │   ├── gallery/        # Galleria immagini e video
│   │   ├── chat/           # Chat interna
│   │   ├── sports-center/  # Centro sportivo: griglia campi, prenotazioni, pagina partita
│   │   │   └── bookings/[id]/  # Dettaglio partita (4 partecipanti)
│   │   ├── rankings/       # Classifiche
│   │   └── settings/       # Impostazioni (solo admin): colori, testi, utenti, centro sportivo, backup
│   ├── ~offline/           # Pagina PWA offline
│   ├── manifest.ts         # Web App Manifest (PWA)
│   ├── sw.ts               # Service Worker (Serwist)
│   └── api/                # API routes
│       ├── auth/           # Login, logout, change-password
│       ├── health/         # Health check endpoint
│       ├── gallery/        # Upload e gestione galleria
│       ├── sports-center/   # courts, bookings, availability, closed-slots
│       └── ...             # Altre API
├── components/
│   ├── pwa/                # Registrazione SW, notifica aggiornamento
│   ├── chat/               # ChatLayout, ChatLayoutLazy
│   ├── tournaments/        # ExportPdfButton, ExportPdfButtonLazy
│   ├── sports-center/      # CourtGrid, BookingForm, BookingsList, SportsCenterClient
│   ├── settings/           # Tab Impostazioni (CentroSportivoTab, UsersTab, ecc.)
│   └── ...                 # Altri componenti React
├── lib/
│   ├── db/                 # Database SQLite
│   │   ├── db.ts           # Connessione e init DB
│   │   ├── queries.ts      # Query principali
│   │   ├── chat-queries.ts # Query chat (TypeScript)
│   │   ├── chat-queries-server.js  # Query chat per server.js (CommonJS)
│   │   └── chat-migration.js       # Migrazione tabelle chat
│   ├── auth.ts             # Autenticazione
│   ├── bracket.ts          # Logica tabellone
│   ├── pairs.ts            # Estrazione coppie
│   └── rankings.ts         # Calcolo classifiche
├── server.js               # Custom server (Next.js + Socket.io)
├── data/                   # Database SQLite (generato)
├── .env                    # Variabili d'ambiente (non in git)
├── .env.example            # Template variabili d'ambiente
└── scripts/                # Script deploy, Nginx, icone PWA
```

## Impostazioni (solo admin)

Da **Impostazioni** (menu laterale, visibile solo agli admin) si gestiscono: colori e testi del sito, utenti e ruoli (admin, player, guest), galleria, **Centro sportivo** (orari apertura/chiusura, durate prenotazioni 60/90 min, slot di chiusura settimanali, gestione campi: aggiungi/modifica/elimina), statistiche, log, backup e strumenti.

## Backup e ripristino

- **Backup completo** (database + avatar + galleria): da Impostazioni → Strumenti, usa **Scarica backup completo**. Si scarica un file ZIP (`padel-full-backup-YYYY-MM-DD.zip`) da conservare fuori dal server (PC, cloud).
- **Backup solo database**: stesso menu, **Scarica backup** per un singolo file `.db` (utile per backup rapidi).
- **Snapshot server (consigliato)**: per backup/rollback “a prova di WAL” e includendo anche upload/config, usare gli script cross-app:
  - `python3 /home/ubuntu/scripts/backup-snapshot.py --app padel-tour --include-pm2-dump`
  - `bash /home/ubuntu/scripts/restore-snapshot.sh --app padel-tour --stamp <STAMP> --dry-run` (verifica) / senza `--dry-run` (restore reale)

**Ripristino su un nuovo server** (dopo crash o migrazione):

1. Clona il repo e installa: `npm install`, configura `.env` (e `DATABASE_PATH` se diverso da `data/padel.db`).
2. Copia il file `padel-full-backup-*.zip` sul server.
3. Ferma l'app: `pm2 stop padel-tour` (se usi PM2).
4. Esegui: `node scripts/restore-backup.mjs /path/to/padel-full-backup-*.zip`.
5. Riavvia l'app: `pm2 start padel-tour`.

## PWA / Installazione come app

Il sito è una Progressive Web App (PWA):

- **Installazione**: Da browser su smartphone/tablet (Chrome: menu → "Installa app" / "Aggiungi a schermata Home"; Safari iOS: Condividi → "Aggiungi a Home").
- **Caching**: Le pagine ranking e tornei usano *stale-while-revalidate*; JS, CSS e immagini usano *cache-first*. In assenza di rete viene mostrata la pagina offline.
- **Aggiornamenti**: Quando è disponibile una nuova versione del sito, compare un banner "È disponibile una nuova versione" con pulsante **Aggiorna**.

Per rigenerare le icone PWA dopo aver modificato `public/logo.png`:

```bash
npm run pwa:icons
```

## Comandi Utili

```bash
# Sviluppo
npm run dev          # Next.js standard (senza WebSocket)
npm run dev:ws       # Custom server con WebSocket (chat + live score)

# Build
npm run build

# Produzione
npm run start

# Icone PWA (da logo.png)
npm run pwa:icons

# Bundle analyzer
npm run build:analyze

# PM2
pm2 status
pm2 logs padel-tour
pm2 restart padel-tour

# Test unitari / integrazione (Vitest)
npm run test

# Test end-to-end (Playwright)
npm run test:e2e

# Lighthouse (performance/SEO, richiede Chrome/Chromium)
npm run lighthouse
npm run lighthouse:extract

# Health check
curl http://localhost:3000/api/health
```

## URL

| Ambiente | URL |
|----------|-----|
| Sviluppo | http://localhost:3000 |
| Produzione | https://bananapadeltour.duckdns.org |

## Risoluzione problemi

- **Il sito non risponde dopo un riavvio**
  In [GUIDA-SERVER.md](GUIDA-SERVER.md) trovi la procedura operativa: avvia Nginx, poi `pm2 start ~/ecosystem.config.js` (o `pm2 restart padel-tour`) e `pm2 save`.

- **Errore "Could not find a production build" o "MODULE_NOT_FOUND"**
  La build in `.next` è mancante o corrotta. Esegui `npm run build` nella root del progetto, poi `pm2 restart padel-tour`.

- **Log e stato**
  `pm2 status`, `pm2 logs padel-tour`. Per dettagli operativi e cronologia interventi vedi [GUIDA-SERVER.md](GUIDA-SERVER.md).

- **Health check**
  `curl http://localhost:3000/api/health` → atteso `{"status":"ok","timestamp":"..."}`. Se ritorna `503`, il database non è raggiungibile.

## Credits

Progetto creato da Matteo Di Benedetto.
