# Report Comparativo – Ottimizzazione Banana Padel Tour

**Data:** 20 Febbraio 2026 (iniziale), aggiornato 28 Febbraio 2026
**Stack attuale:** Next.js 15 · React 19 · Node.js 22 LTS
**Riferimenti:** [baseline-report](baseline-report.md) | [optimization-report](optimization-report.md) | [SECURITY-REPORT](SECURITY-REPORT.md)

---

## Indice

1. [Lighthouse](#1-lighthouse--dati-misurati)
2. [Bundle Size](#2-bundle-size--prima--dopo)
3. [Tempo di caricamento](#3-tempo-di-caricamento--prima--dopo)
4. [Vulnerabilità](#4-vulnerabilità--risolte-e-aperte)
5. [Aggiornamento stack](#5-aggiornamento-stack-28-febbraio-2026)
6. [Suggerimenti scalabilità](#6-suggerimenti-per-scalabilità-futura)

---

## 1. Lighthouse – Dati misurati

### Punteggi e metriche (desktop, ottimizzazione attuale)

| Pagina | Performance | SEO | LCP | FCP | TBT | CLS |
|--------|-------------|-----|-----|-----|-----|-----|
| / | *Da misurare* | - | - | - | - | - |
| /login | *Da misurare* | - | - | - | - | - |
| /profiles/[id] | *Da misurare* | - | - | - | - | - |

**Come popolare:**
1. `npm run build && npm run start`
2. `npm run lighthouse` (richiede Chrome)
3. Per `/` e `/profiles/[id]`: avviare Chrome con `--remote-debugging-port=9222`, fare login, eseguire Lighthouse con `--port=9222` (vedi [LIGHTHOUSE.md](LIGHTHOUSE.md))
4. `npm run lighthouse:extract` → incollare il blocco Markdown nel report

### Effetti attesi dall'ottimizzazione

| Metrica | Effetto atteso | Motivo |
|---------|----------------|--------|
| **LCP** | Miglioramento | Code splitting + lazy load riducono TBT e caricano meno JS iniziale |
| **FCP** | Stabile/migliore | Dynamic import ritarda componenti pesanti (Recharts, jsPDF) |
| **TBT** | Riduzione | Meno script critici sul primo caricamento |
| **CLS** | Nessun peggioramento | Skeleton/placeholder mantengono altezza riservata |
| **SEO** | Già impostato | Metadata, sitemap, robots, Open Graph (vedi [SEO](SEO.md)) |

---

## 2. Bundle Size – Prima / Dopo

### Riepilogo shared e middleware

| Metrica | Prima | Dopo | Delta |
|---------|-------|------|-------|
| **First Load JS shared** | 87.6 kB | 87.6 kB | 0 |
| **Middleware** | 26.6 kB | 26.8 kB | +0.2 kB |

### Route principali – confronto

| Route | Size Prima | Size Dopo | First Load Prima | First Load Dopo | Delta |
|-------|------------|-----------|------------------|-----------------|-------|
| / | 6.06 kB | 6.45 kB | 108 kB | 108 kB | 0 |
| /login | 1.58 kB | 1.61 kB | 94.5 kB | 94.5 kB | 0 |
| /profiles/[id] | 451 kB | **345 kB** | **552 kB** | **446 kB** | **-107 kB** |
| /tournaments/[id]/bracket | 6.21 kB | 6.23 kB | 232 kB | 232 kB | 0 |
| /tournaments/[id] | 3.01 kB | 3.03 kB | 228 kB | 229 kB | +1 kB |
| /settings | 9.26 kB | 9.72 kB | 106 kB | 106 kB | 0 |
| /rankings | 2.51 kB | 2.93 kB | 90.1 kB | 90.6 kB | +0.5 kB |

> **Nota**: Misure rilevate con Next.js 14. Dopo l'upgrade a Next.js 15 il bundle potrebbe variare.

### Sintesi

- **First Load invariato** sulle route principali: il bundle shared resta 87.6 kB.
- **Code splitting attivo**: 8+ componenti ora in chunk separati:
  - ProfileCharts (SVG puro, lazy con Intersection Observer)
  - BracketView, ExportPdfButton (via `ExportPdfButtonLazy.tsx`)
  - HomeCalendar, MvpVoteCard, CountdownBroccoburgher
  - UnifiedRankingsCard, SettingsTabs
  - ChatLayout (via `ChatLayoutLazy.tsx`)
- **Lazy loading**: i componenti pesanti si caricano solo sulle pagine che li usano.

---

## 3. Tempo di caricamento – Prima / Dopo

### Metriche server-side (curl, 5 richieste)

| Metrica | Prima | Dopo | Note |
|---------|-------|------|------|
| **TTFB (/)** | ~4.3 ms | *Non misurato* | Stabile su ambiente locale |
| **TTFB (/login)** | ~8.5 ms | *Non misurato* | |
| **Time Total** | ~4.9 ms | *Non misurato* | |

### Effetti attesi

| Aspetto | Prima | Dopo |
|---------|-------|------|
| TTFB | ~8 ms | Invariato (lato server) |
| LCP | - | Miglioramento atteso per meno JS bloccante |
| FCP | - | Invariato o leggermente migliore |
| TBT | - | Riduzione attesa per code splitting |

---

## 4. Vulnerabilità – Risolte e aperte

### Vulnerabilità applicative risolte (SECURITY-REPORT)

| Area | Stato | Dettaglio |
|------|-------|-----------|
| **SQL Injection** | Risolto | Prepared statements, nessuna concatenazione |
| **XSS** | Risolto | Escaping React, `dangerouslySetInnerHTML` limitato a CSS temi |
| **Rate limit** | Risolto | 100 req/min su API, 5 tentativi login → blocco 1h, cleanup automatico |
| **Session** | Risolto | Iron Session: httpOnly, secure, sameSite strict |
| **Password** | Risolto | bcrypt 12 rounds |
| **Headers** | Risolto | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| **Validazione input** | Risolto | Zod su login, change-password, users, tournaments |
| **Indici DB** | Risolto | Indici ottimizzati per query principali |
| **SESSION_SECRET** | Risolto | 64 caratteri casuali in `.env` |
| **Firewall** | Risolto | UFW attivo (22, 80, 443) |
| **Health check** | Risolto | `/api/health` su entrambe le app |

### Vulnerabilità npm

Dopo l'upgrade a Next.js 15, eseguire `npm audit` per verificare lo stato attuale. Le vulnerabilità legate a Next.js 14 sono state risolte con l'upgrade.

---

## 5. Aggiornamento stack (28 febbraio 2026)

| Componente | Prima | Dopo |
|-----------|-------|------|
| Ubuntu packages | ~40 arretrati | Tutti aggiornati |
| Kernel | 6.8.0-100 | 6.8.0-101 |
| Node.js | 20.20.0 | 22.22.0 LTS (via nvm) |
| npm | 10.8.2 | 10.9.4 |
| Next.js | 14.2.35 | 15.5.12 |
| React | 18 | 19 |
| react-leaflet (Roma-Buche) | 4.2.1 | 5.0.0 |
| framer-motion | 11 | 12 |

### Bug risolti con l'upgrade

- **Errore "bind"** in Sito-Padel: causato da un bug noto in Next.js 14 con custom server, risolto in 15.
- **Roma-Buche crash loop (23 restart)**: La pagina `/logout` era un Server Component che tentava di modificare cookie. Convertita a Client Component.
- **SQLite query error**: Double quotes per stringa vuota in `getBlockedAttempts()` corrette con single quotes.

### Adattamenti per Next.js 15

- `ssr: false` nei Server Components → wrapper Client Component (`ExportPdfButtonLazy.tsx`, `ChatLayoutLazy.tsx`, `MapWithSearchLazy.tsx`)
- Naming conflict `dynamic` (export const vs import) risolto in `profiles/[id]/page.tsx`

---

## 6. Suggerimenti per scalabilità futura

### Infrastruttura

- **PM2 cluster**: `instances: 'max'` per sfruttare più core (richiede Redis adapter per Socket.io)
- **Nginx**: gzip, HTTP/2, cache static, keepalive upstream
- **Security headers**: configurati su entrambe le app
- **Log rotation**: pm2-logrotate attivo
- **Firewall**: UFW attivo
- **Swap**: 2 GB per evitare OOM

### Raccomandazioni applicative

| Area | Suggerimento |
|------|--------------|
| **Cache** | Pulire `.next/cache` in CI o limitare retention |
| **jsPDF** | Valutare `@react-pdf/renderer` o servizio server-side per export PDF |
| **heic-convert** | `libheif-js` non estraibile staticamente; valutare conversione lato server |
| **Database** | SQLite adatto per uso corrente; per più utenti considerare PostgreSQL |
| **Lighthouse** | Inserire Lighthouse in CI per tracciare Performance/SEO nel tempo |
| **Bundle analyzer** | Usare `npm run build:analyze` periodicamente |
| **Notifiche push** | Piano definito in [NOTIFICHE-CONTESTO.md](../NOTIFICHE-CONTESTO.md), implementazione non iniziata |

### Scalabilità orizzontale

- Deploy su più istanze dietro load balancer
- Session store condiviso (es. Redis)
- CDN per asset statici e immagini

---

## Riepilogo esecutivo

| Metrica | Prima | Dopo | Note |
|---------|-------|------|------|
| First Load shared | 87.6 kB | 87.6 kB | Invariato |
| Componenti dynamic | 0 | 8+ | Code splitting attivo |
| Ottimizzazione immagini | - | AVIF/WebP | next.config |
| Vulnerabilità applicative | Parziali | Risolte | Rate limit, validazione, firewall, session secret |
| Next.js | 14.2.35 | 15.5.12 | Bug "bind" risolto |
| Node.js | 20.20.0 | 22.22.0 LTS | EOL aprile 2027 |
| Lighthouse | Non misurato | Non misurato | Da eseguire manualmente |
