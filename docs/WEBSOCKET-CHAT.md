# WebSocket e Chat – Banana Padel Tour

## Indice

- [Panoramica](#panoramica)
- [Architettura server.js](#architettura-serverjs)
- [Avvio](#avvio)
- [Eventi Socket.io](#eventi-socketio)
- [API REST Chat](#api-rest-chat)
- [Schema DB](#schema-db-chat)
- [Scalabilità](#pm2-e-scalabilità)
- [Nginx e TLS](#nginx-e-websocket)

---

## Panoramica

Il progetto utilizza un **custom server** (Node.js + Socket.io, vedi `server.js`) insieme a Next.js 15 per abilitare:

1. **Live Score** - aggiornamento in tempo reale dei punteggi match
2. **Chat interna**:
   - DM tra giocatori
   - chat di gruppo per tornei
   - chat broadcast "con tutti"
   - badge messaggi non letti e marcatura letti
   - possibilità di eliminare messaggi (per admin)

---

## Architettura server.js

Il custom server (`server.js`) è il punto d'ingresso in produzione. Gestisce:

1. **Next.js request handler** – tutte le richieste HTTP passano a `handle(req, res)`
2. **Socket.io** – WebSocket per chat e live score, autenticazione via cookie `padel-session`
3. **Migrazione chat** – `runChatMigration()` all'avvio (da `lib/db/chat-migration.js`)

### Moduli di supporto

| File | Formato | Ruolo |
|------|---------|-------|
| `lib/db/chat-migration.js` | CommonJS | Migrazione tabelle chat (conversations, participants, messages) |
| `lib/db/chat-queries-server.js` | CommonJS | Query chat per server.js (`isParticipant`, `insertMessage`, `getParticipantIds`) |
| `lib/db/chat-queries.ts` | TypeScript | Query chat per API routes Next.js |
| `lib/socket.js` | CommonJS | Configurazione e export Socket.io |

I `require()` dei moduli chat vengono eseguiti **dentro** `app.prepare().then()` per garantire che Next.js abbia completato la compilazione prima di accedere al DB.

> **Nota**: `server.js` non può fare `require` di file TypeScript. Per questo motivo le query chat necessarie al socket handler sono duplicate in `chat-queries-server.js` (plain JavaScript/CommonJS).

---

## Avvio

### Sviluppo

- `npm run dev` - Next.js standard (solo HTTP/API, senza WebSocket)
- `npm run dev:ws` - Custom server con WebSocket (`server.js`): chat + Live Score in tempo reale

### Produzione

```bash
npm run build
npm run start
```

Oppure con PM2:

```bash
pm2 start ecosystem.config.js
```

> In produzione PM2 è configurato con **`instances: 1`** per mantenere tutte le room Socket.io nello stesso processo (vedi `ecosystem.config.js`). Per scalare a più istanze è necessario usare il Redis adapter (vedi sezione "PM2 e scalabilità").

---

## Eventi Socket.io

### Live Score

| Evento           | Direzione  | Payload                                                         |
|------------------|------------|------------------------------------------------------------------|
| `tournament:join`| Client → Server | `tournamentId: string`                                    |
| `tournament:leave`| Client → Server | `tournamentId: string`                                   |
| `match:score`    | Server → Client | `{ matchId, score_pair1, score_pair2, winner_pair_id }` |

Il client si unisce alla room `tournament:{tournamentId}`. Quando un admin salva un risultato tramite l'API REST, il server emette `match:score` a quella room.

### Chat

| Evento         | Direzione  | Payload                                  |
|----------------|------------|------------------------------------------|
| `chat:join`    | Client → Server | `conversationId: string`             |
| `chat:leave`   | Client → Server | `conversationId: string`             |
| `chat:message` | Client → Server | `{ conversationId, body }`            |
| `chat:message` | Server → Client | `{ id, conversation_id, sender_id, body, created_at }` |

Il client si unisce alla room `chat:{conversationId}`. L'autenticazione avviene tramite cookie `padel-session` (Iron Session).

Quando l'utente legge una conversazione:

- il client chiama `POST /api/chat/conversations/[id]/read`;
- il server aggiorna le righe di lettura in DB e ricalcola i conteggi di non letti;
- viene emesso un evento `chat:unread` che fa aggiornare il badge in sidebar.

---

## API REST Chat

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | Lista conversazioni dell'utente |
| POST | `/api/chat/conversations` | Crea DM (`other_user_id`) o chat torneo (`tournament_id`) |
| GET | `/api/chat/conversations/[id]` | Dettagli conversazione |
| GET | `/api/chat/conversations/[id]/messages` | Messaggi (parametri: `limit`, `before`) |
| POST | `/api/chat/conversations/[id]/messages` | Invia messaggio |
| POST | `/api/chat/conversations/[id]/read` | Segna la conversazione come letta per l'utente corrente |
| GET | `/api/chat/users` | Utenti per avviare DM |
| GET | `/api/chat/tournaments` | Tornei per chat gruppo |
| GET | `/api/chat/unread-count` | Conteggio totale messaggi non letti (per badge in sidebar) |

---

## Schema DB Chat

- `chat_conversations` - id, type (dm|tournament|broadcast), tournament_id, created_at
- `broadcast` - messaggio visibile a tutti gli utenti (Chat con tutti)
- `chat_participants` - conversation_id, user_id, joined_at
- `chat_messages` - id, conversation_id, sender_id, body, created_at

---

## PM2 e scalabilità

Il file `ecosystem.config.js` usa `instances: 1` perché Socket.io richiede un singolo processo per le room.

Per scalare con più istanze, aggiungere **Redis Adapter**:

```bash
npm install @socket.io/redis-adapter redis
```

```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const pub = createClient({ url: 'redis://localhost:6379' });
const sub = pub.duplicate();
io.adapter(createAdapter(pub, sub));
```

---

## Nginx e WebSocket

Nginx è configurato per inoltrare gli header WebSocket:

```nginx
location / {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_pass http://padel_backend;
}
```

Per i blocchi non-WebSocket (asset statici, `/_next/static/`), viene usato `proxy_set_header Connection "";` per sfruttare il keepalive upstream.

---

## TLS

TLS va gestito a livello di reverse proxy (Nginx + Let's Encrypt). Il server Node comunica in HTTP; la connessione client-proxy è HTTPS. Le connessioni WebSocket passano in **wss://** tramite Nginx.
