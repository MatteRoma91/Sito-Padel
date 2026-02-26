# Report di Sicurezza - Banana Padel Tour

**Data:** 20 Febbraio 2025  
**Versione:** Post-ottimizzazione backend

---

## 1. Indici SQLite

### Indici aggiunti

| Tabella | Indice | Scopo |
|---------|--------|-------|
| tournaments | `idx_tournaments_status` | Filtri per status |
| tournaments | `idx_tournaments_date_status` | Query composte date+status |
| matches | `idx_matches_pair1`, `idx_matches_pair2` | getMatchHistoryForUser, getPlayerStats |
| pairs | `idx_pairs_player1`, `idx_pairs_player2` | Lookup coppie per utente |
| pairs | `idx_pairs_tournament_seed` | Ordinamento seed per torneo |
| tournament_participants | `idx_tournament_participants_tournament` | Partecipanti per torneo |
| tournament_participants | `idx_tournament_participants_user` | Tornei per utente |
| tournament_rankings | `idx_tournament_rankings_tournament` | Classifiche torneo |
| users | `idx_users_full_name` | ORDER BY full_name |
| mvp_votes | `idx_mvp_votes_tournament` | Voti MVP per torneo |
| login_attempts | `idx_login_attempts_locked` | Query IP bloccati |
| gallery_media | `idx_gallery_media_user`, `idx_gallery_media_created` | Lista galleria per utente, ordinamento per data |
| gallery_media | `idx_gallery_media_user`, `idx_gallery_media_created` | Lista galleria per utente, ordinamento per data |

### Query ottimizzate

Le query più frequenti (`getUserById`, `getUserByUsername`, `getTournamentById`, `getPairs`, `getMatches`, `getTournamentRankings`, `getMatchHistoryForUser`, `getPlayerStats`, `recalculateCumulativeRankings`, `getGalleryMedia`, `getGalleryTotalSize`) beneficiano degli indici sopra.

---

## 2. Validazione input con Zod

### Schemi implementati

- **loginSchema**: username (1-100), password obbligatoria
- **changePasswordSchema**: password minimo 6 caratteri
- **createUserSchema**: username con regex alfanumerico, full_name, nickname, role
- **updateUserSchema**: campi profilo con limiti di lunghezza e enum
- **createTournamentSchema**: name, date (YYYY-MM-DD), time, venue, category, maxPlayers (8|16)
- **updateTournamentSchema**: campi torneo parziali
- **resetPasswordSchema**: password opzionale, minimo 6 se presente
- **archiveFiltersSchema**: year, month, name per filtri archivio

### API protette

- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `POST /api/users`
- `POST /api/tournaments`
- `POST /api/users/[id]/reset-password`

Gli errori di validazione ritornano **400** con messaggio chiaro.

---

## 3. Protezione XSS

### Analisi

| Componente | Stato | Note |
|------------|-------|------|
| React rendering | ✅ | React escape automatico su `{variable}` |
| dangerouslySetInnerHTML | ⚠️ Controllato | Solo in `app/layout.tsx` per CSS temi. Valori limitati a hex `#RRGGBB` da whitelist (`buildConfigCss`). Nessun HTML/JS iniettabile |
| User-generated content | ✅ | Bio, nickname, full_name renderizzati come testo (React escape) |
| site_config (testi) | ⚠️ | I testi del regolamento sono configurabili. Se esposti con dangerouslySetInnerHTML sarebbe rischio. Attualmente mostrati come testo normale |

**Raccomandazione:** Evitare `dangerouslySetInnerHTML` per contenuti utente. Il solo uso attuale (CSS colori) è sicuro.

---

## 4. Rate limit API

### Configurazione

- ** middleware:** 100 richieste per IP per finestra di 1 minuto su tutte le route `/api/*`
- **Eccezione:** `/api/auth/*` (login, logout, change-password) non contate nel rate limit globale
- **Login:** Rate limit specifico via tabella `login_attempts` – 5 tentativi falliti → blocco 1 ora (per IP+username)

### Risposta

- **429 Too Many Requests** se superato il limite

---

## 5. Iron Session

### Configurazione attuale

```typescript
cookieOptions: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 7200, // 2 ore
}
```

| Opzione | Valore | Stato |
|---------|--------|-------|
| httpOnly | `true` | ✅ Cookie non accessibile da JavaScript |
| secure | `true` in production | ✅ Solo HTTPS |
| sameSite | `strict` | ✅ Protezione CSRF rafforzata |

**Nota:** `sameSite: 'strict'` può bloccare il cookie su redirect da domini esterni. Se serve supportare login da link esterni (es. email), considerare `lax` come compromesso.

---

## 6. Bcrypt

### Configurazione

- **Salt rounds:** 12 (file `lib/constants.ts`: `BCRYPT_ROUNDS`)
- **Uso:** `createUser`, `updateUserPassword`, `resetUserPassword`, seed, script add-players

| Requisito | Stato |
|-----------|-------|
| Minimo 10-12 rounds | ✅ 12 rounds |

---

## 7. Raccomandazioni aggiuntive

1. **SESSION_SECRET:** Configurare `SESSION_SECRET` in produzione (min 32 caratteri). Il fallback attuale è solo per sviluppo.
2. **Headers di sicurezza:** Implementati in `next.config.mjs`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
3. **SQL injection:** Le query usano prepared statements (`?` placeholders). Nessuna concatenazione diretta di input utente.
4. **Backup:** Verificare che i backup (`/api/settings/backup`) siano accessibili solo agli admin.
5. **Galleria:** Upload solo per utenti autenticati; eliminazione solo admin. Validazione tipi MIME (JPEG, PNG, WebP, GIF, HEIC, MP4, WebM) e limiti dimensione (10 MB immagini, 500 MB video); limite totale 20 GB.

---

## Riepilogo

| Area | Stato |
|------|-------|
| Indici DB | ✅ Implementati |
| Validazione Zod | ✅ Implementata |
| XSS | ✅ Gestita |
| Rate limit | ✅ Implementato |
| Iron Session | ✅ Configurata |
| Bcrypt | ✅ 12 rounds |
