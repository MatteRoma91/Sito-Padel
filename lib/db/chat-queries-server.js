/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Plain-JS subset of chat-queries for use in server.js (which cannot require .ts files).
 * Provides only the functions needed by the Socket.io handlers.
 */
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const MAX_MESSAGE_LENGTH = 2000;

let db = null;

function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'padel.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function getConversationById(conversationId) {
  return getDb().prepare('SELECT * FROM chat_conversations WHERE id = ?').get(conversationId);
}

function isParticipant(conversationId, userId) {
  const conv = getConversationById(conversationId);
  if (conv?.type === 'broadcast') {
    return !!getDb().prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
  }
  return !!getDb()
    .prepare('SELECT 1 FROM chat_participants WHERE conversation_id = ? AND user_id = ?')
    .get(conversationId, userId);
}

function getParticipantIds(conversationId) {
  const conv = getConversationById(conversationId);
  if (conv?.type === 'broadcast') {
    return getDb().prepare('SELECT id FROM users').all().map(r => r.id);
  }
  return getDb()
    .prepare('SELECT user_id FROM chat_participants WHERE conversation_id = ?')
    .all(conversationId)
    .map(r => r.user_id);
}

function insertMessage(conversationId, senderId, body) {
  if (!isParticipant(conversationId, senderId)) {
    throw new Error('User is not a participant of this conversation');
  }
  const sanitized = body.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!sanitized) {
    throw new Error('Message body cannot be empty');
  }
  const id = crypto.randomUUID();
  const d = getDb();
  d.prepare('INSERT INTO chat_messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)')
    .run(id, conversationId, senderId, sanitized);
  return d.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);
}

module.exports = { isParticipant, insertMessage, getParticipantIds };
