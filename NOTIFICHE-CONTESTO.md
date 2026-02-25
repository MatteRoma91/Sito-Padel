# Contesto: sistema notifiche Web Push

**Data conversazione**: 11 febbraio 2025  
**Stato**: Piano definito, implementazione non iniziata

---

## Obiettivo

Implementare notifiche push sul cellulare degli utenti tramite **solo Web Push** (no Telegram, Email, WhatsApp).

---

## Eventi da notificare

1. **Creazione torneo** → tutti i giocatori
2. **Apertura iscrizioni** → quando status torneo diventa `open`
3. **Promemoria 24h prima** → partecipanti del torneo
4. **Promemoria 2h prima** → partecipanti del torneo
5. **Vincitori del torneo** → quando il torneo viene completato (rankings calculate)
6. **Notifiche personalizzate** → pannello admin per inviare messaggi custom a tutti

---

## Piano completo

Il piano dettagliato (architettura, file da modificare, API, crontab, variabili env) è in:

- **Cursor Plans**: `.cursor/plans/sistema_notifiche_mobile_e6f06629.plan.md`  
  (oppure nella sidebar Plans di Cursor)

---

## Prossimi passi (ordine suggerito)

1. PWA manifest + service worker + chiavi VAPID
2. Tabella `push_subscriptions` + API subscribe/unsubscribe
3. Modulo `lib/notifications` con `sendPushToUser` e `sendPushToAll`
4. UI "Abilita notifiche" (settings o home)
5. Integrazione negli eventi: creazione torneo, apertura iscrizioni, vincitori
6. API `/api/cron/reminders` + tabella `notification_sent` + crontab per promemoria 24h e 2h
7. Tab admin "Invia notifica" + API `POST /api/notifications/send`

---

## Dipendenze da aggiungere

```json
"web-push": "^3.6.6"
```

---

## Variabili da configurare

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (generare con `npx web-push generate-vapid-keys`)
- `CRON_SECRET` per proteggere l'endpoint cron
