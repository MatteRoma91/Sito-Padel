# Report di Sicurezza - Banana Padel Tour

**Data:** 28 Febbraio 2026  
**Aggiornato:** Marzo 2026 (ruoli admin/player/guest, sezione Centro sportivo, indici e autorizzazioni)  
**Versione:** Next.js 15 / Node.js 22

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
| court_bookings | `idx_court_bookings_court_date`, `idx_court_bookings_date` | Prenotazioni per campo/data, disponibilità |
| center_closed_slots | `idx_center_closed_slots_day` | Slot chiusura per giorno settimana |
| court_booking_participants | `idx_court_booking_participants_booking` | Partecipanti per prenotazione |

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

| Componente | Stato | Note |
|------------|-------|------|
| React rendering | Sicuro | React escape automatico su `{variable}` |
| dangerouslySetInnerHTML | Controllato | Solo in `app/layout.tsx` per CSS temi. Valori limitati a hex `#RRGGBB` da whitelist (`buildConfigCss`). Nessun HTML/JS iniettabile |
| User-generated content | Sicuro | Bio, nickname, full_name renderizzati come testo (React escape) |
| site_config (testi) | Controllato | I testi del regolamento sono configurabili. Attualmente mostrati come testo normale |

**Raccomandazione:** Evitare `dangerouslySetInnerHTML` per contenuti utente. Il solo uso attuale (CSS colori) è sicuro.

---

## 4. Rate limit API

### Configurazione

- **Middleware**: 100 richieste per IP per finestra di 1 minuto su tutte le route `/api/*`
- **Eccezione**: `/api/auth/*` (login, logout, change-password) non contate nel rate limit globale
- **Login**: Rate limit specifico via tabella `login_attempts` – 5 tentativi falliti → blocco 1 ora (per IP+username)
- **Cleanup automatico**: `setInterval` ogni 60 secondi rimuove le entry scadute dalla Map del rate limiter, prevenendo memory leak su processi long-running

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
| httpOnly | `true` | Cookie non accessibile da JavaScript |
| secure | `true` in production | Solo HTTPS |
| sameSite | `strict` | Protezione CSRF rafforzata |

**Nota:** `sameSite: 'strict'` può bloccare il cookie su redirect da domini esterni. Se serve supportare login da link esterni (es. email), considerare `lax` come compromesso.

---

## 6. Bcrypt

- **Salt rounds:** 12 (file `lib/constants.ts`: `BCRYPT_ROUNDS`)
- **Uso:** `createUser`, `updateUserPassword`, `resetUserPassword`, seed, script add-players

| Requisito | Stato |
|-----------|-------|
| Minimo 10-12 rounds | 12 rounds |

---

## 7. SESSION_SECRET

In produzione il file `.env` contiene una `SESSION_SECRET` di 64 caratteri generata casualmente. Il fallback nel codice è usato **solo** in sviluppo. Il file `.env.example` documenta il requisito.

---

## 8. Firewall (UFW)

Il firewall UFW è attivo sul server. Porte aperte:

| Porta | Servizio |
|-------|----------|
| 22/tcp | SSH |
| 80/tcp | HTTP (Nginx) |
| 443/tcp | HTTPS (Nginx + Let's Encrypt) |

Le app Node ascoltano su `localhost:3000` e `localhost:3001`, non sono direttamente raggiungibili dall'esterno.

---

## 9. Security Headers

### Configurati in `next.config.mjs` (Sito-Padel)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Configurati in `next.config.mjs` (Roma-Buche)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## 10. Health Check

Endpoint `/api/health` su entrambe le app. Verifica la connessione al database e ritorna:

- `200 OK` con `{"status":"ok","timestamp":"..."}` se tutto funziona
- `503 Service Unavailable` con `{"status":"error","error":"..."}` se il DB non risponde

---

## 11. SSL e certificati

- **Let's Encrypt** gestito tramite Certbot
- Rinnovo automatico con timer systemd
- Hook in `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` per ricaricare Nginx dopo il rinnovo (nessun downtime)

---

## 12. Ruoli e autorizzazione

| Ruolo | Descrizione | Scrittura (POST/PATCH/DELETE) |
|-------|-------------|-------------------------------|
| **admin** | Accesso completo, Impostazioni, creazione utenti | Tutte le API consentite |
| **player** | Tornei, prenotazioni centro sportivo (per sé), chat, galleria | Consentita; prenotazioni solo proprie per PATCH/DELETE bookings |
| **guest** | Navigazione in sola lettura (tornei, profili, classifiche, galleria, chat, centro sportivo) | **403** su tutte le API di modifica; GET consentite |

- **Centro sportivo:** Creazione/modifica/eliminazione campi (`/api/sports-center/courts`) e slot di chiusura (`/api/sports-center/closed-slots`) solo admin. Prenotazioni: admin può prenotare per sé o per ospiti; player solo per sé; guest 403.
- **Impostazioni:** Accessibili solo agli admin (redirect se non admin). Il menu Impostazioni è nascosto ai guest.

---

## 13. Raccomandazioni aggiuntive

1. **SQL injection:** Le query usano prepared statements (`?` placeholders). Nessuna concatenazione diretta di input utente.
2. **Backup:** I backup (`/api/settings/backup`) sono accessibili solo agli admin.
3. **Galleria:** Upload solo per utenti autenticati; eliminazione solo admin. Validazione tipi MIME (JPEG, PNG, WebP, GIF, HEIC, MP4, WebM) e limiti dimensione (10 MB immagini, 500 MB video); limite totale 20 GB.
4. **Nginx upstream keepalive:** `proxy_set_header Connection "";` nei blocchi non-WebSocket evita rinegoziazioni TCP.
5. **Swap 2 GB:** Previene OOM su VPS con RAM limitata.
6. **pm2-logrotate:** Log PM2 limitati a 10M per file, 7 file, compressione attiva.

---

## Riepilogo

| Area | Stato |
|------|-------|
| Indici DB | Implementati (inclusi courts, court_bookings, center_closed_slots) |
| Ruoli (admin/player/guest) | Implementati; guest in sola lettura, 403 su scritture |
| Validazione Zod | Implementata |
| XSS | Gestita |
| Rate limit | Implementato (con cleanup automatico) |
| Iron Session | Configurata (httpOnly, secure, strict) |
| Bcrypt | 12 rounds |
| SESSION_SECRET | Configurato in produzione (64 caratteri) |
| Firewall UFW | Attivo (22, 80, 443) |
| Security Headers | Implementati su entrambe le app |
| Health Check | `/api/health` su entrambe le app |
| SSL | Let's Encrypt, rinnovo automatico + hook |
| Log rotation | pm2-logrotate attivo |
