# Report Comparativo - Ottimizzazione Banana Padel Tour

**Data:** 20 Febbraio 2026  
**Branch:** optimization-refactor  
**Riferimenti:** [baseline-report](baseline-report.md) | [optimization-report](optimization-report.md) | [SECURITY-REPORT](SECURITY-REPORT.md)

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

### Sintesi

- **First Load invariato** sulle route principali: il bundle shared resta 87.6 kB.
- **Code splitting attivo**: 8 componenti ora in chunk separati:
  - ProfileCharts (SVG puro, 0 kB librerie; lazy con Intersection Observer)
  - BracketView, ExportPdfButton
  - HomeCalendar, MvpVoteCard, CountdownBroccoburgher
  - UnifiedRankingsCard
  - SettingsTabs
- **Lazy loading**: i componenti pesanti si caricano solo sulle pagine che li usano.
- **Piccolo overhead**: +1 kB circa su alcune route per loading/skeleton component.

---

## 3. Tempo di caricamento – Prima / Dopo

### Metriche server-side (curl, 5 richieste)

| Metrica | Prima | Dopo | Note |
|---------|-------|------|------|
| **TTFB (/)** | ~4.3 ms | *Non misurato* | Stabile su ambiente locale |
| **TTFB (/login)** | ~8.5 ms | *Non misurato* | |
| **Time Total** | ~4.9 ms | *Non misurato* | |

### Metriche client-side (LCP, FCP, TBT, CLS)

- **Prima**: non disponibili (Lighthouse non eseguito).
- **Dopo**: vedi tabella Lighthouse sopra (Performance, LCP, FCP, TBT, CLS).

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
| **SQL Injection** | ✅ | Prepared statements, nessuna concatenazione |
| **XSS** | ✅ | Escaping React, `dangerouslySetInnerHTML` limitato a CSS temi |
| **Rate limit** | ✅ | 100 req/min su API, 5 tentativi login → blocco 1h |
| **Session** | ✅ | Iron Session: httpOnly, secure, sameSite strict |
| **Password** | ✅ | bcrypt 12 rounds |
| **Headers** | ✅ | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| **Validazione input** | ✅ | Zod su login, change-password, users, tournaments |
| **Indici DB** | ✅ | Indici ottimizzati per query principali |

### Vulnerabilità npm (23 totali – 1 moderate, 22 high)

| Pacchetto | Gravità | Fix disponibile | Note |
|-----------|---------|-----------------|------|
| **jspdf** | High | `npm audit fix` | Fix senza breaking change |
| **next** | High | `npm audit fix --force` | Upgrade a 16.x (breaking) |
| **ajv** (eslint) | Moderate | `--force` | Cambio maggiore ESLint |
| **glob** | High | `--force` | Via eslint-config-next |
| **minimatch** | High | `--force` | Catena di dipendenze |

**Consiglio:** eseguire `npm audit fix` per risolvere jsPDF; per Next.js e ESLint valutare upgrade in un rilascio dedicato.

---

## 5. Suggerimenti per scalabilità futura

### Infrastruttura (già prevista)

- **PM2 cluster**: `instances: 'max'` per sfruttare più core
- **Nginx**: gzip, HTTP/2, cache static
- **Security headers**: già configurati
- **Log rotation**: pm2-logrotate

### Raccomandazioni applicative

| Area | Suggerimento |
|------|--------------|
| **Cache** | Pulire `.next/cache` in CI (≈96% di 301 MB) o limitare retention |
| **jsPDF** | Valutare `@react-pdf/renderer` o servizio server-side per esporti PDF |
| **Recharts** | Sostituito con grafico SVG puro; ProfileCharts carica solo quando visibile (IO). /profiles/[id] da 553 a 446 kB |
| **heic-convert** | `libheif-js` non estraibile staticamente; valutare conversione lato server |
| **Database** | SQLite adatto per uso corrente; per più utenti considerare PostgreSQL con connection pooling |
| **SESSION_SECRET** | Configurare in produzione (≥32 caratteri) |
| **Lighthouse** | Inserire Lighthouse in CI per tracciare Performance/SEO nel tempo |
| **Bundle analyzer** | Usare `npm run build:analyze` periodicamente per verificare crescita del bundle |

### Scalabilità orizzontale

- Deploy su più istanze dietro load balancer
- Session store condiviso (es. Redis) se si abbandona `iron-session` in-memory
- CDN per asset statici e immagini

---

## Riepilogo esecutivo

| Metrica | Prima | Dopo | Note |
|---------|-------|------|------|
| First Load shared | 87.6 kB | 87.6 kB | Invariato |
| Componenti dynamic | 0 | 8 | Code splitting attivo |
| Ottimizzazione immagini | - | AVIF/WebP | next.config |
| Vulnerabilità applicative | Parziali | Risolte | Rate limit, validazione, sicurezza sessione |
| Vulnerabilità npm | 23 | 23 | Da gestire con `npm audit fix` |
| Lighthouse | Non misurato | Non misurato | Da eseguire manualmente |
