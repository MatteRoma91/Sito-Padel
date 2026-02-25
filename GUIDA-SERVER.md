# Guida Server – Banana Padel Tour

> **Nota**: Questo file non è servito dal sito (non è in `/public`). È una guida operativa da aggiornare man mano che si effettuano modifiche.

**Sito**: https://bananapadeltour.duckdns.org  
**Server**: VPS (OVH), IP pubblico 57.131.40.170  
**Utente**: ubuntu (con sudo)

**Documentazione correlata**: [README.md](README.md) (overview, installazione, PWA) · **[AVVIO.md](AVVIO.md)** (comandi da lanciare all’avvio del server)

---

## Avvio dopo un riavvio del server

Dopo un reboot (o se i servizi sono stati fermati), esegui in ordine:

1. **Nginx**: `sudo systemctl start nginx` (o `restart`)
2. **App**: `cd /home/ubuntu/Sito-Padel` → `pm2 start ecosystem.config.js` oppure `pm2 restart padel-tour`
3. **Salva PM2**: `pm2 save`

Se hai modificato il codice o la build è corrotta, prima esegui `npm run build`.  
Elenco completo e blocchi copia-incolla: **[AVVIO.md](AVVIO.md)**.

---

## Variabili d’ambiente (produzione)

In `/home/ubuntu/Sito-Padel` puoi usare un file `.env` (non in git). Utili in produzione:

| Variabile | Uso |
|-----------|-----|
| `SESSION_SECRET` | Segreto per cookie di sessione; usare stringa lunga e casuale |
| `DATABASE_PATH` | Percorso del database SQLite (default: `data/padel.db`) |
| `PORT` | Porta su cui ascolta l’app (default: 3000) |
| `NODE_ENV` | PM2 imposta `production` in `ecosystem.config.js` |

Dopo aver modificato `.env`, riavviare l’app: `pm2 restart padel-tour`.

---

## Cronologia interventi

### 1. Verifica iniziale (1 febbraio 2026)

**Obiettivo**: Verificare che tutti i processi necessari al funzionamento del sito fossero attivi.

**Architettura**:
```
Utente → DuckDNS → Nginx (:443/:80) → Next.js (:3000) → SQLite (padel.db)
```

**Componenti verificati**:

| Componente     | Stato iniziale    | Azione eseguita                          |
|----------------|-------------------|------------------------------------------|
| Nginx          | ✅ Attivo         | Nessuna                                  |
| PM2/padel-tour | ❌ Non avviato    | `pm2 start ecosystem.config.js`          |
| Porta 3000     | ❌ Non in ascolto | Avviata con PM2                          |
| DNS DuckDNS    | ✅ OK             | Risolve a 57.131.40.170                  |
| Certificato SSL| ✅ Valido         | Let's Encrypt, scadenza 1 maggio 2026    |
| Database       | ✅ Presente       | `/home/ubuntu/Sito-Padel/data/padel.db`  |

**Comandi eseguiti**:
```bash
# Avvio applicazione
cd /home/ubuntu/Sito-Padel && pm2 start ecosystem.config.js

# Salvataggio lista PM2
pm2 save

# Configurazione avvio automatico al boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

### 2. Limite upload Nginx – `client_max_body_size` (1 febbraio 2026)

**Problema**: Nginx rifiutava upload avatar > 1MB con errore "client intended to send too large body".

**Soluzione**: Impostato `client_max_body_size 25M` nella configurazione Nginx.

**File modificato**: `/etc/nginx/sites-available/padel-tour`

**Modifica**:
```nginx
server {
    server_name bananapadeltour.duckdns.org;
    client_max_body_size 25M;   # <-- aggiunto
    # ...
}
```

**Comandi**:
```bash
sudo sed -i '/server_name bananapadeltour.duckdns.org;/a\    client_max_body_size 25M;' /etc/nginx/sites-available/padel-tour
sudo nginx -t && sudo systemctl reload nginx
```

**Nota**: L’app Next.js limita gli avatar a 5MB (`MAX_SIZE` in `app/api/users/[id]/avatar/route.ts`). Nginx ora accetta fino a 25MB; sopra 5MB la richiesta arriva ma viene rifiutata dall’API.

---

## Pacchetti/servizi installati (ordine indicativo)

> Basato sulla configurazione esistente. L’ordine rispecchia le dipendenze logiche.

1. **Node.js** (v20) – runtime per l’app Next.js
2. **npm** – gestione dipendenze
3. **Nginx** – reverse proxy e SSL
4. **Certbot** – certificati Let's Encrypt
5. **PM2** (globale) – process manager per Node.js
6. **DNS DuckDNS** – dominio bananapadeltour.duckdns.org → IP del server (configurato su duckdns.org)

---

## File di configurazione principali

| File                         | Ruolo                                   |
|-----------------------------|-----------------------------------------|
| `/etc/nginx/sites-available/padel-tour` | Config Nginx per il dominio       |
| `/etc/nginx/sites-enabled/padel-tour`   | Symlink per abilitare il sito     |
| `ecosystem.config.js`       | Config PM2 (nome app, porta, path)      |
| `scripts/deploy.sh`         | Script di deploy                       |
| `scripts/setup-nginx.sh`    | Setup Nginx                            |
| `scripts/setup-https.sh`    | Setup SSL con Certbot                  |

---

## Backup e ripristino

- **Backup completo**: Impostazioni → Strumenti → **Scarica backup completo**. Scarica un ZIP con database e avatar. Conservare il file fuori dal server (PC, cloud).
- **Backup solo database**: stesso menu, **Scarica backup** (file `.db`).

**Ripristino su nuovo server** (dopo crash o migrazione):

1. Clonare/copiare l’applicazione, `npm install`, configurare `.env` (e `DATABASE_PATH` se diverso da `data/padel.db`).
2. Copiare il file `padel-full-backup-*.zip` sul server.
3. Fermare l’app: `pm2 stop padel-tour`.
4. Eseguire: `node scripts/restore-backup.mjs /path/to/padel-full-backup-*.zip`.
5. Riavviare l’app: `pm2 start padel-tour`.

Eseguire lo script di ripristino preferibilmente con l’app ferma per evitare corruzione del database.

---

## Comandi utili

```bash
# Stato servizi
sudo systemctl status nginx
pm2 status

# Log
pm2 logs padel-tour
sudo tail -f /var/log/nginx/error.log

# Riavvio
pm2 restart padel-tour
sudo systemctl reload nginx

# Deploy (build + restart PM2)
cd /home/ubuntu/Sito-Padel && ./scripts/deploy.sh
```

---

## Risoluzione problemi

- **Sito non risponde dopo riavvio**  
  Segui [AVVIO.md](AVVIO.md): `sudo systemctl start nginx`, poi `pm2 start ecosystem.config.js` o `pm2 restart padel-tour`, infine `pm2 save`.

- **Errore “Could not find a production build” o “MODULE_NOT_FOUND” nei log PM2**  
  Build mancante o corrotta. In `/home/ubuntu/Sito-Padel` eseguire `npm run build`, poi `pm2 restart padel-tour`.

- **Verifica che l’app risponda**  
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → atteso 200, 302 o 307.  
  `ss -tlnp | grep 3000` → deve mostrare il processo in ascolto sulla porta 3000.

- **PWA / Service Worker**  
  HTTPS obbligatorio. Dopo deploy, il nuovo `sw.js` è generato da `next build`; nessuna modifica Nginx necessaria. Verifica: Chrome DevTools → Application → Service Workers (vedi intervento n. 6 in cronologia).

---

### 3. Miglioramento contrasto testo (1 febbraio 2026)

**Problema**: Testo secondario poco leggibile (troppo chiaro) nelle pagine Tornei, Giocatori, Classifiche e nelle tabelle/righe.

**Soluzione**: Sostituzione di `text-slate-600` con `text-slate-700` e `dark:text-slate-600` con `dark:text-slate-400` per migliorare il contrasto (WCAG).

**File modificati**: Pagine dashboard (tournaments, profiles, rankings, archive, calendar, pairs), componenti (TournamentRankingView, BracketView, ParticipantsManager, PairsManager, EditTournamentForm, GenerateBracketButton, PairsDisplay, PairsExtractor, DeleteUserButton).

---

### 4. Ricalcolo colori per leggibilità globale (1 febbraio 2026)

**Problema**: Testo illeggibile in dark mode (es. Dashboard Server: valori bianchi su card bianche). Sottotitoli su gradient poco visibili.

**Soluzione**:
- **Card in dark mode**: sfondo `dark:bg-primary-900/80` invece di `dark:bg-white/95` (allineato al tema blu)
- **Input in dark mode**: `dark:bg-primary-800/50 dark:text-slate-100`
- **Testo card**: `text-slate-900 dark:text-slate-100` come default
- **Colori secondari**: `dark:text-slate-400` → `dark:text-slate-300` per contrasto su card scure
- **Link "Torna a..."**: aggiunto `dark:text-slate-300 dark:hover:text-accent-400`
- **Bordi/divisori**: `dark:border-primary-600/50`, `dark:divide-primary-600/50`
- **Hover sulle righe**: `dark:hover:bg-primary-800/50`

**File modificati**: `globals.css`, `stats/server/page.tsx`, `ServerDashboardAutoRefresh.tsx`, `stats/accessi/page.tsx`, `stats/reset-password/page.tsx`, `ResetPasswordClient.tsx`, tutte le pagine dashboard e componenti con card/table.

---

### 5. Palette Blu-Lime esplicita (1 febbraio 2026)

**Obiettivo**: Applicare la palette dell'immagine (blu reale #3445F1, lime neon #B2FF00, bianco #FFFFFF, blu secondari #6270F3 e #9AB0F8) a tutto il sito con valori hex espliciti.

**Modifiche**:
- **globals.css**: `.btn-primary` bg-[#B2FF00], `.btn-secondary` bg-[#9AB0F8], `.card` border-[#9AB0F8], `.input` border e focus ring lime
- **Sidebar**: bg-[#3445F1], hover bg-[#6270F3], link attivi bg-[#B2FF00], bordi white/20 o #6270F3
- **Auth e Home**: gradiente `from-[#3445F1] via-[#6270F3] to-[#9AB0F8]`, CTA lime
- **Componenti**: sostituzione di primary-* e accent-* con hex (#3445F1, #6270F3, #9AB0F8, #B2FF00, #f8ffeb, #f2ffcc, #e5ff99, #629900, #76b300)

---

### 6. PWA / Offline Mode (20 febbraio 2026)

**Obiettivo**: Rendere il sito installabile come app su smartphone/tablet, con caching differenziato e notifica aggiornamenti.

**Implementazione**:
- **Serwist** (successore di next-pwa): Service Worker generato a build (`public/sw.js`), non committato (in `.gitignore`).
- **Manifest**: `app/manifest.ts` → `/manifest.webmanifest` (nome app, icone 192×192 e 512×512, theme/background).
- **Caching**: *Stale-while-revalidate* per pagine `/`, `/rankings`, `/tournaments`; *cache-first* per script, stili e immagini; fallback offline su `/~offline`.
- **Notifica nuova versione**: componente `RegisterPWA` registra il SW e mostra un banner “È disponibile una nuova versione” con pulsante **Aggiorna** quando un nuovo Service Worker è in attesa.

**Requisiti server**:
- **HTTPS** obbligatorio per PWA e Service Worker (già in uso con Nginx + Let's Encrypt).
- Nginx deve servire `/sw.js` e `/manifest.webmanifest` come il resto del sito (nessuna modifica necessaria se il proxy passa tutto a Next.js).
- Dopo un deploy (`./scripts/deploy.sh`), il nuovo `sw.js` viene generato da `next build`; gli utenti con la app aperta vedranno il banner di aggiornamento.

**File/script rilevanti**:
| Elemento | Ruolo |
|----------|--------|
| `next.config.mjs` | withSerwistInit, header Cache-Control per `/sw.js` |
| `app/sw.ts` | Definizione Service Worker e strategie di cache |
| `app/manifest.ts` | Web App Manifest |
| `app/~offline/page.tsx` | Pagina mostrata offline |
| `components/pwa/RegisterPWA.tsx` | Registrazione SW e banner aggiornamento |
| `public/icons/icon-192.png`, `icon-512.png` | Icone PWA (generate da `logo.png`) |
| `npm run pwa:icons` | Rigenera icone da `public/logo.png` |

**Verifica**: Dopo il deploy, da Chrome (desktop o mobile) aprire il sito → DevTools → Application → Service Workers; verificare che lo SW sia attivo e che in “Cache Storage” compaiano i cache (pages-swr, scripts, styles, images). Test offline: Application → Service Workers → “Offline” e ricaricare una pagina già visitata.

---

## Prossimi aggiornamenti

> Aggiungere qui le modifiche successive con data e descrizione.
