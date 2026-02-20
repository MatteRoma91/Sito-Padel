# Report Ottimizzazione Frontend

**Data:** 2026-02-20  
**Branch:** optimization-refactor

---

## Ottimizzazioni applicate

### 1. Dynamic Import per componenti pesanti
- **ProfileCharts** (Recharts ~400 kB) - next/dynamic con ssr: false sulla pagina profilo
- **BracketView** - dynamic import sulla pagina tabellone
- **ExportPdfButton** (jsPDF) - dynamic con ssr: false su bracket e dettaglio torneo
- **HomeCalendar, MvpVoteCard, CountdownBroccoburgher** - dynamic sulla home
- **UnifiedRankingsCard** - dynamic sulla pagina classifiche
- **SettingsTabs** - dynamic sulla pagina impostazioni

### 2. Configurazione immagini
- next.config.mjs: attivati formati AVIF e WebP per next/image

### 3. Bundle Analyzer
- Aggiunto @next/bundle-analyzer
- Script: npm run build:analyze (ANALYZE=true)

### 4. Tree-shaking
- Verificato: import nominati per lucide-react e recharts
- Next.js 14 abilita tree-shaking di default

### 5. use client
- I componenti che richiedono use client (useState, usePathname, event handlers) sono stati mantenuti
- La riduzione non era possibile senza perdere interattivita essenziale

---

## Bundle Size - Confronto Prima/Dopo

### Riepilogo shared
| Metrica | Prima | Dopo | Delta |
|---------|-------|------|-------|
| First Load JS shared | 87.6 kB | 87.6 kB | 0 |
| Middleware | 26.6 kB | 26.6 kB | 0 |

### Route principali
| Route | Size Prima | Size Dopo | First Load Prima | First Load Dopo | Delta |
|-------|------------|-----------|------------------|-----------------|------|
| / | 6.06 kB | 6.45 kB | 108 kB | 108 kB | 0 |
| /login | 1.58 kB | 1.58 kB | 94.5 kB | 94.5 kB | 0 |
| /profiles/[id] | 451 kB | 451 kB | 552 kB | 553 kB | +1 kB |
| /tournaments/[id]/bracket | 6.21 kB | 6.23 kB | 232 kB | 232 kB | 0 |
| /tournaments/[id] | 3.01 kB | 3.03 kB | 228 kB | 229 kB | +1 kB |
| /settings | 9.26 kB | 9.72 kB | 106 kB | 106 kB | 0 |
| /rankings | 2.51 kB | 2.93 kB | 90.1 kB | 90.6 kB | +0.5 kB |

---

## Dimensione bundle - Sintesi

### Vantaggi principali
1. **Code splitting**: Recharts, BracketView, ExportPdfButton, SettingsTabs in chunk separati caricati solo sulle pagine che li usano
2. **Lazy loading**: Home, Rankings, Settings, Bracket caricano componenti pesanti in modo differito
3. **Caricamento progressivo**: Skeleton/placeholder durante il caricamento dei componenti dinamici

### Perche First Load resta simile
- First Load JS per route include i chunk necessari al primo render di quella pagina
- Su /profiles/[id] Recharts e ancora richiesto: il chunk viene caricato alla visita del profilo
- Le route con dynamic import hanno piccolo overhead (loading component)

---

## Lighthouse score

Lighthouse richiede Chrome/Chromium. Per generare i punteggi:

```bash
npm run start
npx lighthouse http://localhost:3000/login --output=json --output=html --output-path=./reports/optimized-login
```

---

## Differenza rispetto al baseline

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Componenti con dynamic import | 0 | 8 |
| Bundle shared | 87.6 kB | 87.6 kB |
| Route piu pesante | 552 kB | 553 kB |
| Ottimizzazione immagini | - | AVIF/WebP |
| Bundle analyzer | - | npm run build:analyze |

---

## File modificati

- next.config.mjs
- app/(dashboard)/profiles/[id]/page.tsx
- app/(dashboard)/tournaments/[id]/bracket/page.tsx
- app/(dashboard)/tournaments/[id]/page.tsx
- app/(dashboard)/page.tsx
- app/(dashboard)/rankings/page.tsx
- app/(dashboard)/settings/page.tsx
- package.json (script build:analyze)
