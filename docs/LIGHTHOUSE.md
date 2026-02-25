# Guida all'esecuzione di Lighthouse

Per generare i dati Lighthouse per il [REPORT-COMPARATIVO](REPORT-COMPARATIVO.md) è necessario eseguire Lighthouse su un sistema con **Chrome** o **Chromium** installato.

## Requisiti

- **Chrome/Chromium** (versione recente)
- **Node.js** e `npm install` eseguito
- **Server attivo** su `http://localhost:3000` (o URL configurabile)

## Passi

### 1. Avviare il server

```bash
npm run build && npm run start
```

Oppure in sviluppo: `npm run dev`

### 2. Eseguire Lighthouse

```bash
npm run lighthouse
```

Oppure con URL personalizzato:

```bash
BASE_URL=https://tuodominio.it npm run lighthouse
```

Se Chrome non è nel PATH, specificare il percorso:

```bash
CHROME_PATH=/usr/bin/chromium npm run lighthouse
# oppure su macOS:
CHROME_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome npm run lighthouse
```

### 3. Pagine con autenticazione

`/` e `/profiles/[id]` richiedono login. Lo script usa una sessione vuota per `/login`; per homepage e profilo:

1. Avviare Chrome con debugging:
   ```bash
   google-chrome --remote-debugging-port=9222
   # oppure chromium --remote-debugging-port=9222
   ```

2. Nel browser aperto: andare su `http://localhost:3000/login`, effettuare il login (admin/admin123)

3. In un altro terminale:
   ```bash
   npx lighthouse http://localhost:3000 --port=9222 --only-categories=performance,seo --output=json --output-path=./docs/reports/lighthouse-homepage
   npx lighthouse http://localhost:3000/profiles/0f888506-30f7-4c81-afce-1b98c774bb5c --port=9222 --only-categories=performance,seo --output=json --output-path=./docs/reports/lighthouse-profiles-id
   ```

(Sostituire l'ID profilo con uno valido dal database se necessario.)

### 4. Estrarre le metriche

```bash
npm run lighthouse:extract
```

Lo script legge i file in `docs/reports/` e:
- Salva `docs/reports/lighthouse-metrics.json`
- Stampa un blocco Markdown da incollare nel REPORT-COMPARATIVO

### 5. Aggiornare il report

Incollare l'output del blocco Markdown nella sezione "1. Lighthouse" del REPORT-COMPARATIVO.

## Metriche estratte

| Campo | Descrizione |
|-------|-------------|
| **Performance** | Punteggio 0-100 |
| **SEO** | Punteggio 0-100 |
| **LCP** | Largest Contentful Paint (ms) |
| **FCP** | First Contentful Paint (ms) |
| **TBT** | Total Blocking Time (ms) |
| **CLS** | Cumulative Layout Shift |

## Alternativa: Docker

Se Docker è disponibile ma non Chrome:

```bash
# Con --network=host, localhost:3000 è raggiungibile dal container
docker run --rm --cap-add=SYS_ADMIN --network=host \
  -v "$(pwd)/docs/reports:/home/lighthouse/reports" \
  genv/lighthouse:latest http://localhost:3000/login
```

Poi rinominare il file JSON in `lighthouse-login.report.json` e usare `npm run lighthouse:extract`.
