# Centro sportivo – Banana Padel Tour

Gestione campi e prenotazioni in stile Playtomic: griglia giorno/campi/slot, prenotazioni 60 o 90 minuti, nome prenotazione, pagina partita con 4 partecipanti.

**Stack:** Next.js 15 · React 19 · SQLite (better-sqlite3)

---

## Indice

- [Panoramica](#panoramica)
- [Ruoli e visibilità](#ruoli-e-visibilità)
- [Modello dati](#modello-dati)
- [API](#api)
- [Impostazioni (admin)](#impostazioni-admin)
- [UI e flusso](#ui-e-flusso)

---

## Panoramica

- **Griglia**: righe = slot da 30 min (es. 08:00, 08:30, …), colonne = campi. Celle: **libera** (prenotabile), **occupata** (prenotazione con nome e link alla partita), **chiuso** (centro chiuso in quella fascia).
- **Prenotazioni**: durata **60 o 90 minuti** (configurabile in Impostazioni). Ogni prenotazione ha un **nome obbligatorio** e viene mostrata come **cella unificata** (rowSpan) sulla griglia.
- **Pagina partita**: cliccando su una prenotazione si apre `/sports-center/bookings/[id]` dove si possono assegnare **4 partecipanti** (utenti del sito) alle posizioni 1–4. Modifica consentita ad admin o a chi ha creato la prenotazione; guest in sola lettura.
- **Configurazione**: da Impostazioni → tab **Centro sportivo** l’admin imposta orari apertura/chiusura, durate consentite (60, 90 o entrambe), **slot di chiusura** (fasce orarie non prenotabili, per giorno della settimana) e **gestione campi** (aggiungi, modifica nome/tipo/ordine, elimina).

---

## Ruoli e visibilità

| Ruolo   | Centro sportivo | Azioni |
|--------|------------------|--------|
| **admin** | Visibile | Prenota per sé o per ospiti; modifica/elimina qualsiasi prenotazione; gestisce campi e slot chiusura in Impostazioni |
| **player** | Visibile | Prenota solo per sé; modifica/elimina solo le proprie prenotazioni; può assegnare partecipanti alle proprie partite |
| **guest** | Visibile (sola lettura) | Nessun pulsante Prenota/Modifica/Elimina; può aprire la pagina partita in sola lettura |

---

## Modello dati

- **courts**: `id`, `name`, `type` (indoor | outdoor), `display_order`
- **court_bookings**: `id`, `court_id`, `date`, `slot_start`, `slot_end`, `booking_name`, `booked_by_user_id`, `guest_name`, `guest_phone`, `status` (confirmed | cancelled), `created_at`, `created_by`
- **court_booking_participants**: `id`, `booking_id`, `user_id`, `position` (1–4), UNIQUE(booking_id, position)
- **center_closed_slots**: `id`, `day_of_week` (0=domenica … 6=sabato), `slot_start`, `slot_end`

Config in **site_config**: `court_open_time`, `court_close_time`, `court_allowed_durations` (es. `"60,90"`).

---

## API

Tutte sotto prefisso `/api/sports-center/`. Autenticazione obbligatoria (cookie sessione).

| Metodo | Route | Descrizione | Chi |
|--------|--------|-------------|-----|
| GET | `/courts` | Lista campi ordinata | Tutti |
| POST | `/courts` | Crea campo (name, type, display_order) | Solo admin |
| PATCH | `/courts/[id]` | Aggiorna nome/tipo/ordine | Solo admin |
| DELETE | `/courts/[id]` | Elimina campo (solo se nessuna prenotazione confermata) | Solo admin |
| GET | `/bookings?date=YYYY-MM-DD` | Prenotazioni per data | Tutti |
| POST | `/bookings` | Crea prenotazione (court_id, date, slot_start, slot_end, **booking_name** obbligatorio, …) | Admin, player (guest 403) |
| GET | `/bookings/[id]` | Dettaglio prenotazione + partecipanti | Tutti |
| PATCH | `/bookings/[id]` | Aggiorna slot o partecipanti (array 4 posizioni) o annulla | Admin, owner prenotazione |
| DELETE | `/bookings/[id]` | Cancella prenotazione | Admin, owner |
| GET | `/availability?date=YYYY-MM-DD` | Per ogni campo: slot con stato free/occupied/closed | Tutti |
| GET | `/closed-slots` | Lista slot di chiusura | Solo admin |
| PUT | `/closed-slots` | Aggiungi (action: 'add') o rimuovi (action: 'delete') slot chiusura | Solo admin |

---

## Impostazioni (admin)

Tab **Centro sportivo** in Impostazioni (solo admin):

1. **Orari**: Apertura e chiusura (es. 08:00 – 23:00).
2. **Durate consentite**: Checkbox 60 min e/o 90 min (almeno una).
3. **Slot di chiusura**: Form giorno + fascia (slot_start–slot_end); elenco con rimuovi. Le celle in queste fasce risultano "chiuso" in availability e non sono prenotabili.
4. **Gestione campi**: Lista campi con modifica inline (nome, tipo coperto/scoperto, ordine), salva ed elimina; form per aggiungere nuovo campo.

---

## UI e flusso

- **Pagina principale** `/sports-center`: selettore data, pulsanti giorno precedente/successivo e "Oggi", griglia CourtGrid, lista prenotazioni del giorno (BookingsList) con nome prenotazione, prenotante e link al dettaglio.
- **Prenotazione**: click su cella libera → modale BookingForm (nome prenotazione obbligatorio, durata 60/90 min, per admin opzione "per me" o "per ospite" con nome/telefono).
- **Pagina partita** `/sports-center/bookings/[id]`: intestazione con nome, campo (e tipo coperto/scoperto), data, orario; sezione Partecipanti con 4 select (utenti del sito + "Nessuno"); salvataggio con PATCH participants (solo se canEdit).

File principali: `app/(dashboard)/sports-center/page.tsx`, `components/sports-center/SportsCenterClient.tsx`, `CourtGrid.tsx`, `BookingForm.tsx`, `BookingsList.tsx`, `app/(dashboard)/sports-center/bookings/[id]/page.tsx`, `BookingDetailClient.tsx`, `components/settings/CentroSportivoTab.tsx`.
