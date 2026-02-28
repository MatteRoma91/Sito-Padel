/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time migration: add 'group' type to chat_conversations CHECK constraint.
 * Safe to run multiple times - skips if already applied.
 */
function runChatMigration() {
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
}

module.exports = { runChatMigration };
