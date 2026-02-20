# Baseline Report - Ottimizzazione

**Data:** 2026-02-20 08:32:36  
**Branch:** optimization-refactor  
**Commit:** d0493a22580c2d8f538a09e0dddf6f756fcaff39

---

## Lighthouse Scores (0-100)

> **Nota:** Lighthouse richiede Chrome/Chromium installato. In questo ambiente non era disponibile. Per generare i punteggi Lighthouse, eseguire manualmente con il server avviato (`npm run start`):
>
> ```bash
> npx lighthouse http://localhost:3000/login --output=json --output=html --output-path=./reports/baseline-login
> ```
>
> Poi estrarre `categories.performance.score`, `categories.seo.score`, `categories['best-practices'].score` dal JSON (valori 0-1, moltiplicare per 100).
> Per metriche client-side (LCP, FCP, TBT) usare `audits` nel report JSON.

| Pagina | Performance | SEO | Best Practices |
|--------|--------------|-----|----------------|
| /login | *da eseguire manualmente* | *da eseguire manualmente* | *da eseguire manualmente* |

---

## Bundle Size (next build)

### Riepilogo

- **First Load JS shared:** 87.6 kB  
  - chunks/117: 31.9 kB  
  - chunks/fd9d1056: 53.6 kB  
  - other shared chunks: 2.09 kB  
- **Middleware:** 26.6 kB

### Route principali (First Load JS)

| Route | Size | First Load JS |
|-------|------|---------------|
| / | 6.06 kB | 108 kB |
| /login | 1.58 kB | 94.5 kB |
| /profiles/[id] | 451 kB | **552 kB** |
| /tournaments/[id]/bracket | 6.21 kB | **232 kB** |
| /tournaments/[id] | 3.01 kB | **228 kB** |
| /settings | 9.26 kB | 106 kB |
| /tournaments/[id]/pairs | 3.91 kB | 106 kB |
| /profiles | 1.99 kB | 104 kB |
| /pairs | 2.03 kB | 98.4 kB |
| /archive | 1.87 kB | 98.2 kB |
| /calendar | 179 B | 96.5 kB |
| /tournaments | 179 B | 96.5 kB |

### Output build completo

```
Route (app)                                         Size     First Load JS
┌ ƒ /                                               6.06 kB         108 kB
├ ○ /_not-found                                     876 B          88.5 kB
├ ƒ /archive                                        1.87 kB        98.2 kB
├ ƒ /calendar                                       179 B          96.5 kB
├ ○ /change-password                                2.08 kB        89.7 kB
├ ○ /login                                          1.58 kB        94.5 kB
├ ƒ /pairs                                          2.03 kB        98.4 kB
├ ƒ /profiles                                       1.99 kB         104 kB
├ ƒ /profiles/[id]                                  451 kB          552 kB
├ ƒ /rankings                                       2.51 kB        90.1 kB
├ ƒ /regolamento                                    155 B          87.8 kB
├ ƒ /settings                                       9.26 kB         106 kB
├ ƒ /tournaments                                    179 B          96.5 kB
├ ƒ /tournaments/[id]                               3.01 kB         228 kB
├ ƒ /tournaments/[id]/bracket                       6.21 kB         232 kB
├ ƒ /tournaments/[id]/edit                          1.37 kB        97.7 kB
├ ƒ /tournaments/[id]/pairs                         3.91 kB         106 kB
└ ƒ /tournaments/new                                1.42 kB        97.8 kB
+ First Load JS shared by all                       87.6 kB
ƒ Middleware                                        26.6 kB
```

---

## Dimensione cartella .next

| Percorso | Dimensione |
|----------|------------|
| **Totale** | **301 MB** |
| .next/cache | 290 MB |
| .next/server | 6.8 MB |
| .next/static | 3.8 MB |
| .next/trace | 116 KB |
| .next/types | 664 KB |
| Manifesti e config | ~100 KB |

---

## Tempo di caricamento homepage

**Pagina testata:** `/login` (prima pagina accessibile senza auth; `/` reindirizza qui)

### Metriche curl (server-side, 5 richieste)

| Metrica | Valori (s) | Media |
|---------|------------|-------|
| TTFB | 0.0085 | ~8.5 ms |
| Time Total | 0.004-0.008 | ~4.9 ms |
| TTFB (/) | 0.0043 | ~4.3 ms |

### Metriche Lighthouse (LCP, FCP, TBT)

*Richiedono esecuzione manuale di Lighthouse con Chrome.*  
Da estrarre da `audits['largest-contentful-paint']`, `audits['first-contentful-paint']`, `audits['total-blocking-time']` nel report JSON.

---

---

## Report Ottimizzazione (Post-Frontend)

**Data ottimizzazione:** 2026-02-20

### Ottimizzazioni applicate
- Dynamic import: ProfileCharts, BracketView, ExportPdfButton, HomeCalendar, MvpVoteCard, CountdownBroccoburgher, UnifiedRankingsCard, SettingsTabs
- next.config: bundle-analyzer, images AVIF/WebP
- Tree-shaking verificato (lucide-react, recharts)

### Bundle dopo ottimizzazione
| Route | Size | First Load JS |
|-------|------|---------------|
| / | 6.45 kB | 108 kB |
| /profiles/[id] | 451 kB | 553 kB |
| /tournaments/[id]/bracket | 6.23 kB | 232 kB |
| Shared | - | 87.6 kB |

### Differenza vs baseline
- First Load shared: invariato 87.6 kB
- Code splitting: 8 componenti ora in chunk separati (lazy load)
- Lighthouse: eseguire manualmente (Chrome richiesto)

---

## Note

- Build con warning: `libheif-js` (heic-convert) - dependency non estraibile staticamente. Potenziale candidato per ottimizzazione.
- Route con First Load JS più alto: `/profiles/[id]` (552 kB), `/tournaments/[id]/bracket` (232 kB), `/tournaments/[id]` (228 kB).
- Cache `.next` occupa ~96% della cartella (290 MB su 301 MB). Considerare pulizia cache in CI o limiti di retention.
