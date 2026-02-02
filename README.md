# Padel Tour

Sito privato per la gestione di tornei di padel.

## Funzionalità

- **Autenticazione**: Login con username/password, ruoli Admin/Giocatore
- **Giocatori**: Gestione profili giocatori
- **Tornei**: Creazione e gestione tornei
- **Estrazione Coppie**: Algoritmo forte+debole per bilanciare le coppie
- **Tabellone**: Quarti, semifinali, finale + tabellone consolazione
- **Classifiche**: Classifica torneo e classifica cumulativa
- **Calendario**: Vista calendario tornei
- **Export PDF**: Esportazione tabellone e classifica

## Tecnologie

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)
- PM2 (process manager)
- Nginx (reverse proxy)

## Requisiti

- Node.js 20+
- npm

## Installazione

```bash
# Clona il repository
cd /home/ubuntu/Sito-Padel

# Installa dipendenze
npm install

# Build
npm run build

# Avvia in sviluppo
npm run dev

# Avvia in produzione
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

## Credenziali Iniziali

Al primo avvio viene creato l'utente admin:

- **Username**: admin
- **Password**: admin123

⚠️ Cambia la password dopo il primo login!

## Struttura Progetto

```
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Pagina login
│   ├── (dashboard)/        # Pagine protette
│   │   ├── tournaments/    # Gestione tornei
│   │   ├── profiles/       # Profili giocatori
│   │   ├── pairs/          # Estrazione coppie
│   │   ├── calendar/       # Calendario
│   │   └── rankings/       # Classifiche
│   └── api/                # API routes
├── components/             # Componenti React
├── lib/
│   ├── db/                 # Database SQLite
│   ├── auth.ts             # Autenticazione
│   ├── bracket.ts          # Logica tabellone
│   ├── pairs.ts            # Estrazione coppie
│   └── rankings.ts         # Calcolo classifiche
├── data/                   # Database SQLite (generato)
└── scripts/                # Script deploy
```

## Backup e ripristino

- **Backup completo** (database + avatar): da Impostazioni → Strumenti, usa **Scarica backup completo**. Si scarica un file ZIP (`padel-full-backup-YYYY-MM-DD.zip`) da conservare fuori dal server (PC, cloud).
- **Backup solo database**: stesso menu, **Scarica backup** per un singolo file `.db` (utile per backup rapidi).

**Ripristino su un nuovo server** (dopo crash o migrazione):

1. Clona il repo e installa: `npm install`, configura `.env` (e `DATABASE_PATH` se diverso da `data/padel.db`).
2. Copia il file `padel-full-backup-*.zip` sul server.
3. Ferma l’app: `pm2 stop padel-tour` (se usi PM2).
4. Esegui: `node scripts/restore-backup.mjs /path/to/padel-full-backup-*.zip`.
5. Riavvia l’app: `pm2 start padel-tour`.

## Comandi Utili

```bash
# Sviluppo
npm run dev

# Build
npm run build

# Produzione
npm run start

# PM2
pm2 status
pm2 logs
pm2 restart padel-tour
```

## URL

- Sviluppo: http://localhost:3000
- Produzione: https://bananapadeltour.duckdns.org
