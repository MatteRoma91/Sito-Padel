# Report Ottimizzazione Frontend

**Data:** 20 Febbraio 2026 (iniziale), aggiornato 28 Febbraio 2026
**Stack attuale:** Next.js 15 · React 19 · Node.js 22 LTS

---

## Ottimizzazioni applicate

### 1. Dynamic Import per componenti pesanti

Componenti con `next/dynamic` per code splitting:

- **ProfileCharts** (Recharts ~400 kB) - lazy load sulla pagina profilo
- **BracketView** - dynamic import sulla pagina tabellone
- **ExportPdfButton** (jsPDF) - richiede browser API, usa wrapper Client Component `ExportPdfButtonLazy.tsx` con `ssr: false`
- **HomeCalendar, MvpVoteCard, CountdownBroccoburgher** - dynamic sulla home
- **UnifiedRankingsCard** - dynamic sulla pagina classifiche
- **SettingsTabs** - dynamic sulla pagina impostazioni
- **ChatLayout** (Socket.io) - wrapper Client Component `ChatLayoutLazy.tsx` con `ssr: false`

> **Nota Next.js 15**: `ssr: false` con `next/dynamic` non è più consentito direttamente nei Server Components. Per i componenti che lo richiedono (browser API, Socket.io), sono stati creati wrapper Client Component dedicati (suffisso `Lazy.tsx`).

### 2. Configurazione immagini
- `next.config.mjs`: attivati formati AVIF e WebP per `next/image`

### 3. Bundle Analyzer
- Aggiunto `@next/bundle-analyzer`
- Script: `npm run build:analyze` (ANALYZE=true)

### 4. Tree-shaking
- Verificato: import nominati per lucide-react e recharts
- Next.js 15 abilita tree-shaking di default (Turbopack)

### 5. use client
- I componenti che richiedono `use client` (useState, usePathname, event handlers) sono stati mantenuti
- La riduzione non era possibile senza perdere interattività essenziale

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

> **Nota**: Queste misure risalgono a Next.js 14. Dopo l'upgrade a Next.js 15 il bundle potrebbe variare leggermente grazie a miglioramenti interni (Turbopack, migliore tree-shaking).

---

## Dimensione bundle - Sintesi

### Vantaggi principali
1. **Code splitting**: Recharts, BracketView, ExportPdfButton, SettingsTabs in chunk separati caricati solo sulle pagine che li usano
2. **Lazy loading**: Home, Rankings, Settings, Bracket caricano componenti pesanti in modo differito
3. **Caricamento progressivo**: Skeleton/placeholder durante il caricamento dei componenti dinamici

### Perché il First Load resta simile
- First Load JS per route include i chunk necessari al primo render di quella pagina
- Su /profiles/[id] Recharts è ancora richiesto: il chunk viene caricato alla visita del profilo
- Le route con dynamic import hanno piccolo overhead (loading component)

---

## File modificati

- `next.config.mjs`
- `app/(dashboard)/profiles/[id]/page.tsx`
- `app/(dashboard)/tournaments/[id]/bracket/page.tsx`
- `app/(dashboard)/tournaments/[id]/page.tsx`
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/rankings/page.tsx`
- `app/(dashboard)/settings/page.tsx`
- `app/(dashboard)/chat/page.tsx`
- `components/tournaments/ExportPdfButtonLazy.tsx` (nuovo, wrapper ssr:false)
- `components/chat/ChatLayoutLazy.tsx` (nuovo, wrapper ssr:false)
- `package.json` (script build:analyze)
