/**
 * Custom server: Next.js + Socket.io
 * Required for WebSocket support (live score, chat).
 * Usage: node server.js (after next build for production)
 */
const { createServer } = require('node:http');
const next = require('next');
const { Server } = require('socket.io');
const { unsealData } = require('iron-session');
const { runChatMigration } = require('./lib/db/chat-migration');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

const SESSION_PASSWORD = (() => {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    console.error('SESSION_SECRET è obbligatorio in produzione');
    process.exit(1);
  }
  if (!secret) {
    console.warn('[SECURITY] SESSION_SECRET non impostato. Usa una variabile d\'ambiente in produzione.');
  }
  return secret || 'complex_password_at_least_32_characters_long_for_iron_session';
})();
const SESSION_COOKIE = 'padel-session';
const SESSION_TTL = 60 * 60 * 2; // 2 ore

function parseCookie(cookieHeader) {
  if (!cookieHeader) return {};
  const obj = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key && rest.length) {
      obj[key] = rest.join('=').trim();
    }
  }
  return obj;
}

async function getUserIdFromHandshake(handshake) {
  const cookieHeader = handshake.headers?.cookie;
  const cookies = parseCookie(cookieHeader);
  const sealed = cookies[SESSION_COOKIE];
  if (!sealed) return null;
  try {
    const data = await unsealData(sealed, {
      password: SESSION_PASSWORD,
      ttl: SESSION_TTL,
    });
    if (data?.isLoggedIn && data?.userId) return data.userId;
  } catch {
    // invalid or expired
  }
  return null;
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  runChatMigration();

  try {
    const { ensureDb } = require('./lib/db/queries');
    ensureDb();
    console.log('> DB pre-warmed');
  } catch (e) {
    console.warn('> DB pre-warm skip:', e?.message || e);
  }

  const chatQueries = require('./lib/db/chat-queries-server');
  const { setIo } = require('./lib/socket');

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  setIo(io);

  io.on('connection', async (socket) => {
    const userId = await getUserIdFromHandshake(socket.handshake);
    socket.userId = userId;
    if (userId) socket.join(`user:${userId}`);

    socket.on('tournament:join', (tournamentId) => {
      if (tournamentId && typeof tournamentId === 'string') {
        socket.join(`tournament:${tournamentId}`);
      }
    });

    socket.on('tournament:leave', (tournamentId) => {
      if (tournamentId && typeof tournamentId === 'string') {
        socket.leave(`tournament:${tournamentId}`);
      }
    });

    socket.on('chat:join', (conversationId) => {
      if (!userId) return;
      if (conversationId && typeof conversationId === 'string') {
        if (chatQueries.isParticipant(conversationId, userId)) {
          socket.join(`chat:${conversationId}`);
        }
      }
    });

    socket.on('chat:leave', (conversationId) => {
      if (conversationId && typeof conversationId === 'string') {
        socket.leave(`chat:${conversationId}`);
      }
    });

    socket.on('chat:message', async (payload) => {
      if (!userId) return;
      const { conversationId, body } = payload || {};
      if (!conversationId || typeof body !== 'string') return;

      if (!chatQueries.isParticipant(conversationId, userId)) return;

      try {
        const msg = chatQueries.insertMessage(conversationId, userId, body);
        io.to(`chat:${conversationId}`).emit('chat:message', {
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          body: msg.body,
          created_at: msg.created_at,
        });
        const participantIds = chatQueries.getParticipantIds(conversationId);
        for (const pid of participantIds) {
          if (pid !== userId) {
            io.to(`user:${pid}`).emit('chat:unread', { userId: pid, conversationId });
          }
        }
      } catch {
        // validation failed
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
