# Report Lighthouse

I file `lighthouse-*.report.json` in questa cartella sono generati da Lighthouse.

| File | Descrizione |
|------|-------------|
| `lighthouse-login.report.json` | Punteggio pagina `/login` |
| `lighthouse-homepage.report.json` | Pagine homepage (richiede login) |
| `lighthouse-profiles-id.report.json` | Pagina profilo (richiede login) |
| `lighthouse-metrics.json` | Metriche estratte da `npm run lighthouse:extract` |

**Come generare:** eseguire `npm run lighthouse` (richiede Chrome) e poi `npm run lighthouse:extract`. Dettagli in [LIGHTHOUSE.md](../LIGHTHOUSE.md).
