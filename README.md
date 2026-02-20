# Padel Tour

Sito privato per la gestione di tornei di padel.

## Documentazione

| File | Contenuto |
|------|-----------|
| **[AVVIO.md](AVVIO.md)** | Comandi da eseguire all’avvio del server (Nginx, build, PM2) |
| **[GUIDA-SERVER.md](GUIDA-SERVER.md)** | Guida operativa server: architettura, cronologia interventi, backup, PWA, troubleshooting |

## Funzionalità

- **Autenticazione**: Login con username/password, ruoli Admin/Giocatore
- **Giocatori**: Gestione profili giocatori
- **Tornei**: Creazione e gestione tornei
- **Estrazione Coppie**: Algoritmo forte+debole per bilanciare le coppie
- **Tabellone**: Quarti, semifinali, finale + tabellone consolazione
- **Classifiche**: Classifica torneo e classifica cumulativa
- **Calendario**: Vista calendario tornei
- **Export PDF**: Esportazione tabellone e classifica
- **Chat**: Chat tra utenti e per torneo (WebSocket)
- **PWA / Offline**: Sito installabile come app su smartphone/tablet; caching intelligente (stale-while-revalidate per ranking e tornei, cache-first per asset statici); notifica quando è disponibile una nuova versione

## Tecnologie

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)
- Serwist (PWA, Service Worker)
- PM2 (process manager)
- Nginx (reverse proxy)

## Requisiti

- Node.js 20+
- npm

## Variabili d’ambiente (opzionali)

Crea un file `.env` nella root (non committato). Esempi:

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `SESSION_SECRET` | Segreto per la sessione (produzione: usare valore lungo e casuale) | valore di fallback in codice |
| `DATABASE_PATH` | Percorso del file SQLite | `data/padel.db` |
| `PORT` | Porta dell’app Node | `3000` |
| `NEXT_PUBLIC_SITE_URL` | URL pubblico del sito (per SEO e PWA) | da `VERCEL_URL` o esempio |

In produzione imposta almeno `SESSION_SECRET` con una stringa sicura.

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
│   ├── ~offline/           # Pagina PWA offline
│   ├── manifest.ts         # Web App Manifest (PWA)
│   ├── sw.ts               # Service Worker (Serwist)
│   └── api/                # API routes
├── components/
│   ├── pwa/                # Registrazione SW, notifica aggiornamento
│   └── ...                 # Altri componenti React
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

## PWA / Installazione come app

Il sito è una Progressive Web App (PWA):

- **Installazione**: Da browser su smartphone/tablet (Chrome: menu → “Installa app” / “Aggiungi a schermata Home”; Safari iOS: Condividi → “Aggiungi a Home”).
- **Caching**: Le pagine ranking e tornei usano *stale-while-revalidate*; JS, CSS e immagini usano *cache-first*. In assenza di rete viene mostrata la pagina offline.
- **Aggiornamenti**: Quando è disponibile una nuova versione del sito, compare un banner “È disponibile una nuova versione” con pulsante **Aggiorna**.

Per rigenerare le icone PWA dopo aver modificato `public/logo.png`:

```bash
npm run pwa:icons
```

## Comandi Utili

```bash
# Sviluppo
npm run dev

# Build
npm run build

# Produzione
npm run start

# Icone PWA (da logo.png)
npm run pwa:icons

# PM2
pm2 status
pm2 logs
pm2 restart padel-tour
```

## URL

- Sviluppo: http://localhost:3000
- Produzione: https://bananapadeltour.duckdns.org

## Risoluzione problemi

- **Il sito non risponde dopo un riavvio**  
  Segui i comandi in [AVVIO.md](AVVIO.md): avvia Nginx, poi `pm2 start ecosystem.config.js` (o `pm2 restart padel-tour`) e `pm2 save`.

- **Errore “Could not find a production build” o “MODULE_NOT_FOUND”**  
  La build in `.next` è mancante o corrotta. Esegui `npm run build` nella root del progetto, poi `pm2 restart padel-tour`.

- **Log e stato**  
  `pm2 status`, `pm2 logs padel-tour`. Per dettagli operativi e cronologia interventi vedi [GUIDA-SERVER.md](GUIDA-SERVER.md).
