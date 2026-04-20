# Lezioni e carnet – Banana Padel Tour

## Navigazione (menu)

- **Admin e maestro**: menu **Lezioni** → `/lezioni` (vista completa staff).
- **Giocatore** con almeno un carnet (titolare o partner su carnet coppia): menu **Lezioni** → `/lezioni` con **solo i propri carnet** e le richieste/annulli.
- **Giocatore senza carnet** e **guest**: nessuna voce Lezioni.
- **Prenota un campo**: per i giocatori **non** è mostrato il blocco lezioni; per **admin/maestro** resta una scorciatoia testuale verso `/lezioni`.

## Vista giocatore: scheda carnet

- Ogni carnet è mostrato come **scheda** con **bollini** (uno per lezione prevista): i bollini si riempiono in ordine cronologico man mano che vengono registrati i consumi.
- Espandendo la scheda si vedono le **lezioni svolte**: data/ora (fuso Europa/Roma), **maestro**, e un campo **Argomento** (testo libero, max 1000 caratteri) salvato sul consumo e modificabile dal titolare/partner del carnet o dallo staff (`PATCH /api/lesson-consumptions/[id]`).

## Ruoli

- **`maestro`**: staff lezioni (assegnazione carnet, convalida richieste, lezione diretta, timbro manuale). Stessi permessi generali dell’app dei giocatori salvo dove indicato.
- **`admin`**: come il maestro, più **eliminazione carnet**, **annulla ultima lezione** (undo consumo e prenotazione campo).

## Carnet

- Tipi: **privato** o **coppia** (un carnet condiviso, 5 lezioni totali).
- Assegnazione: **admin** e **maestro** tramite API `POST /api/lesson-entitlements` o pagina **Lezioni** (`/lezioni`).

## Richieste

- I giocatori con carnet attivo **richiedono** data/ora dalla pagina **`/lezioni`** (o tramite `POST /api/lesson-requests`, senza scelta campo in richiesta).
- **Convalida**: maestro o admin scelgono **campo e fascia oraria** (lezione **60 minuti**) in `/lezioni` o approvando da flusso dedicato (`POST /api/lesson-requests/[id]/approve`). Opzionalmente possono indicare l’**argomento** della lezione (stesso campo salvato sul consumo).
- L’utente può **annullare** una richiesta pending (`POST /api/lesson-requests/[id]/cancel`).

## Timetable

- Le lezioni approvate creano una prenotazione `court_bookings` con `booking_kind = 'lesson'` e partecipanti (maestro + allievo/i).

## Timbro manuale

- Consumo carnet **senza** riga in griglia: solo **admin** e **maestro**, con **motivo obbligatorio** (`POST /api/lesson-entitlements/[id]/consume-manual`). Opzionale campo **argomento** (`notes`). Il maestro sulla registrazione è facoltativo per il timbro manuale se esistono maestri nel sistema (obbligatorio per lezioni con booking in griglia).

## API principali

| Metodo | Path | Note |
|--------|------|------|
| GET/POST | `/api/lesson-entitlements` | Lista / crea carnet |
| GET/DELETE | `/api/lesson-entitlements/[id]` | Dettaglio+consumi; delete solo admin |
| POST | `/api/lesson-entitlements/[id]/consume-manual` | Timbro manuale |
| POST | `/api/lesson-entitlements/[id]/undo-last` | Solo admin |
| GET/POST | `/api/lesson-requests` | Lista / crea richiesta |
| POST | `/api/lesson-requests/[id]/approve` | Staff |
| POST | `/api/lesson-requests/[id]/reject` | Staff |
| POST | `/api/lesson-requests/[id]/cancel` | Richiedente |
| POST | `/api/lesson-sessions/direct` | Lezione senza richiesta |
| PATCH | `/api/lesson-consumptions/[id]` | Aggiorna argomento (`notes`), max 1000 caratteri |
| GET | `/api/cron/security-logs-prune` | Solo cron: elimina `security_logs` più vecchi di 6 mesi (`CRON_SECRET`) |

## Tabelle SQLite

- `lesson_entitlements`, `lesson_consumptions`, `lesson_requests`
- `court_bookings.booking_kind`: `standard` | `lesson`
- `security_logs.type` include `lesson_event` per audit
