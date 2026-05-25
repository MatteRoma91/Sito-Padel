# Contesto: sistema notifiche Web Push

**Stato (2026):** implementato lato server e client (subscribe, VAPID, invii da API e cron). Questo documento descrive comportamento, variabili d'ambiente e manutenzione.

## Stack

- Next.js + Service Worker (Serwist) per PWA
- `web-push` sul server (`lib/notifications/push.ts`)
- Endpoint: `POST /api/notifications/subscribe`, `POST /api/notifications/unsubscribe`, `GET /api/notifications/vapid-public`
- Cron: `GET /api/cron/tournament-reminders` (header `Authorization: Bearer $CRON_SECRET`)

## Eventi notificati (principali)

1. Creazione torneo / iscrizioni aperte → spesso broadcast a tutti i giocatori (`sendPushToAllPlayers`)
2. Torneo completato → partecipanti effettivi (`sendPushToTournamentParticipants`, solo `participating = 1`)
3. Promemoria 24h / 2h prima → stesso filtro partecipanti nel cron

## Variabili d'ambiente

Vedi [`.env.example`](.env.example): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.

## UI

- **Impostazioni → Notifiche**: componente `PushNotificationsPrompt` per abilitare/disabilitare sul dispositivo corrente.

## Note sicurezza

- In produzione impostare `CRON_SECRET` e non esporre gli endpoint `/api/cron/*` senza Bearer token.
