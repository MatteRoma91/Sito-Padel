/**
 * Custom server: Next.js + Socket.io
 * Required for WebSocket support (live score, chat).
 * Usage: node server.js (after next build for production)
 */
const { createServer } = require('node:http');
const { parse } = require('node:url');
const next = require('next');
const { Server } = require('socket.io');
const { unsealData } = require('iron-session');

const SESSION_PASSWORD = process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_iron_session';
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
  // Fix chat_conversations migration (add 'group' type) if needed - prima di ensureDb
  try {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'padel.db');
    const db = new Database(dbPath);
    const oldExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_chat_conv_old'").get();
    const checkResult = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_conversations'").get();
    const hasGroup = checkResult?.sql?.includes("'group'") ?? false;
    if (!hasGroup && (oldExists || checkResult?.sql)) {
      db.exec('BEGIN');
      try {
        if (oldExists) {
          db.exec('PRAGMA foreign_keys = OFF');
          db.exec('DROP TABLE IF EXISTS chat_conversations');
          db.exec(`CREATE TABLE chat_conversations (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('dm', 'tournament', 'broadcast', 'group')), tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
          db.exec('INSERT INTO chat_conversations SELECT id, type, tournament_id, created_at FROM _chat_conv_old');
          db.exec('DROP TABLE _chat_conv_old');
          db.exec('PRAGMA foreign_keys = ON');
        } else {
          db.exec('ALTER TABLE chat_conversations RENAME TO _chat_conv_old');
          db.exec(`CREATE TABLE chat_conversations (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('dm', 'tournament', 'broadcast', 'group')), tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
          db.exec('INSERT INTO chat_conversations SELECT id, type, tournament_id, created_at FROM _chat_conv_old');
          db.exec('DROP TABLE _chat_conv_old');
        }
        db.exec('COMMIT');
        console.log('> Chat migration (group type) applied');
      } catch (e) {
        db.exec('ROLLBACK');
        db.exec('PRAGMA foreign_keys = ON');
        throw e;
      }
    }
    db.close();
  } catch (e) {
    console.warn('> Chat migration skip:', e?.message || e);
  }
  // Pre-warm DB per evitare cold start sulla prima richiesta (initSchema + seed lenti)
  try {
    const { ensureDb } = require('./lib/db/queries');
    ensureDb();
    console.log('> DB pre-warmed');
  } catch (e) {
    console.warn('> DB pre-warm skip:', e?.message || e);
  }

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  const { setIo } = require('./lib/socket');
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
        const { isParticipant } = require('./lib/db/chat-queries');
        if (isParticipant(conversationId, userId)) {
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

      const { isParticipant, insertMessage, getParticipantIds } = require('./lib/db/chat-queries');
      if (!isParticipant(conversationId, userId)) return;

      try {
        const msg = insertMessage(conversationId, userId, body);
        io.to(`chat:${conversationId}`).emit('chat:message', {
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          body: msg.body,
          created_at: msg.created_at,
        });
        const participantIds = getParticipantIds(conversationId);
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
