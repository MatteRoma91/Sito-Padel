# Guida SEO - Banana Padel Tour

## Implementato

### Meta dinamici e Open Graph
- **Root layout**: metadata con `generateMetadata` da `getSiteConfig` (nome tour personalizzabile)
- **Login**: `Accedi | Banana Padel Tour` + descrizione dedicata
- **Change password**: `Cambia password | Banana Padel Tour` (noindex)
- **Dashboard**: metadata con noindex per area riservata
- **Tournament/[id]**: titolo dinamico con nome torneo
- **Profiles/[id]**: titolo dinamico con nome giocatore

### Open Graph completo
- `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`, `og:site_name`
- Twitter Card: `summary` con titolo, descrizione e immagine
- `metadataBase` per URL assoluti corretti

### Sitemap.xml automatica
- `/sitemap.xml` – generata da `app/sitemap.ts`
- Include: home (`/`), `/login`
- `changeFrequency` e `priority` configurati

### Robots.txt
- `/robots.txt` – generata da `app/robots.ts`
- `Allow: /` per home e login
- `Disallow` per: `/profiles/`, `/tournaments/`, `/rankings`, `/api/`, ecc.
- Riferimento a `sitemap.xml` e `host` opzionale

### Structured data (Schema.org)
- **SportsOrganization**: nome, URL, descrizione, logo
- **WebSite**: nome, URL, descrizione

### Ottimizzazioni Core Web Vitals
- **LCP**: `priority` su immagini above-the-fold (logo login, banner home)
- **CLS**: dimensioni esplicite su immagini, font `display: swap`
- **INP**: componenti leggeri, loading states con altezza riservata

## Variabili d'ambiente per produzione

Per URL corretti in sitemap, Open Graph e canonical:

```env
NEXT_PUBLIC_SITE_URL=https://tuodominio.it
```

Su Vercel viene usato automaticamente `VERCEL_URL`.

## Verifica Lighthouse SEO

1. Deploy in produzione (o `npm run build && npm run start`).
2. Apri Chrome → DevTools → Lighthouse.
3. Seleziona categoria **SEO**.
4. Avvia analisi sulla pagina `/login` (pubblica).

Punti controllati da Lighthouse SEO:
- Meta description
- Titolo `<title>` univoco
- Open Graph
- Validità di robots.txt
- Sitemap
- Structured data
- Core Web Vitals (Performance)
