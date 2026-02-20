# WebSocket e Chat - Banana Padel Tour

## Panoramica

Il progetto utilizza un **custom server** (Node.js + Socket.io) insieme a Next.js per abilitare:

1. **Live Score** - aggiornamento in tempo reale dei punteggi match
2. **Chat** - messaggi privati (DM) e chat di gruppo per tornei

## Avvio

### Sviluppo

- `npm run dev` - Next.js standard (senza WebSocket)
- `npm run dev:ws` - Custom server con WebSocket (richiede `npm run build` in precedenza, oppure avvia in dev mode)

### Produzione

```bash
npm run build
npm run start
```

Oppure con PM2:

```bash
pm2 start ecosystem.config.js
```

## Eventi Socket.io

### Live Score

| Evento           | Direzione  | Payload                                                         |
|------------------|------------|------------------------------------------------------------------|
| `tournament:join`| Client → Server | `tournamentId: string`                                    |
| `tournament:leave`| Client → Server | `tournamentId: string`                                   |
| `match:score`    | Server → Client | `{ matchId, score_pair1, score_pair2, winner_pair_id }` |

Il client si unisce alla room `tournament:{tournamentId}`. Quando un admin salva un risultato tramite l’API REST, il server emette `match:score` a quella room.

### Chat

| Evento         | Direzione  | Payload                                  |
|----------------|------------|------------------------------------------|
| `chat:join`    | Client → Server | `conversationId: string`             |
| `chat:leave`   | Client → Server | `conversationId: string`             |
| `chat:message` | Client → Server | `{ conversationId, body }`            |
| `chat:message` | Server → Client | `{ id, conversation_id, sender_id, body, created_at }` |

Il client si unisce alla room `chat:{conversationId}`. L’autenticazione avviene tramite cookie `padel-session` (Iron Session).

## API REST Chat

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | Lista conversazioni dell’utente |
| POST | `/api/chat/conversations` | Crea DM (`other_user_id`) o chat torneo (`tournament_id`) |
| GET | `/api/chat/conversations/[id]` | Dettagli conversazione |
| GET | `/api/chat/conversations/[id]/messages` | Messaggi (parametri: `limit`, `before`) |
| POST | `/api/chat/conversations/[id]/messages` | Invia messaggio |
| GET | `/api/chat/users` | Utenti per avviare DM |
| GET | `/api/chat/tournaments` | Tornei per chat gruppo |

## Schema DB Chat

- `chat_conversations` - id, type (dm|tournament|broadcast), tournament_id, created_at
- `broadcast` - messaggio visibile a tutti gli utenti (Chat con tutti)
- `chat_participants` - conversation_id, user_id, joined_at
- `chat_messages` - id, conversation_id, sender_id, body, created_at

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

## Nginx e WebSocket

Se si usa Nginx come reverse proxy, assicurarsi di inoltrare gli header WebSocket:

```nginx
location / {
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_pass http://localhost:3000;
}
```

## TLS

TLS va gestito a livello di reverse proxy (Nginx, Cloudflare, ecc.). Il server Node comunica in HTTP; la connessione client↔proxy è HTTPS.
