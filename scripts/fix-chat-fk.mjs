#!/usr/bin/env node
/** Fix chat tables with wrong FK referencing _chat_conv_old. Run: node scripts/fix-chat-fk.mjs */
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'padel.db');
const db = new Database(dbPath);
const sql = db.prepare("SELECT sql FROM sqlite_master WHERE name='chat_participants'").get()?.sql || '';
if (!sql.includes('_chat_conv_old')) { console.log('Already OK'); db.close(); process.exit(0); }
db.exec('PRAGMA foreign_keys = OFF'); db.exec('BEGIN');
try {
  db.exec('CREATE TABLE chat_participants_new (conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, joined_at TEXT NOT NULL DEFAULT (datetime(\'now\')), PRIMARY KEY (conversation_id, user_id))');
  db.exec('INSERT INTO chat_participants_new SELECT * FROM chat_participants'); db.exec('DROP TABLE chat_participants'); db.exec('ALTER TABLE chat_participants_new RENAME TO chat_participants');
  db.exec('CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id)');
  db.exec('CREATE TABLE chat_messages_new (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime(\'now\')))');
  db.exec('INSERT INTO chat_messages_new SELECT * FROM chat_messages'); db.exec('DROP TABLE chat_messages'); db.exec('ALTER TABLE chat_messages_new RENAME TO chat_messages');
  db.exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id)'); db.exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)');
  db.exec('CREATE TABLE chat_last_read_new (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, last_read_at TEXT NOT NULL, PRIMARY KEY (user_id, conversation_id))');
  db.exec('INSERT INTO chat_last_read_new SELECT * FROM chat_last_read'); db.exec('DROP TABLE chat_last_read'); db.exec('ALTER TABLE chat_last_read_new RENAME TO chat_last_read');
  db.exec('CREATE INDEX IF NOT EXISTS idx_chat_last_read_user ON chat_last_read(user_id)');
  db.exec('COMMIT'); db.exec('PRAGMA foreign_keys = ON');
  console.log('Fixed chat tables.');
} catch (e) { db.exec('ROLLBACK'); db.exec('PRAGMA foreign_keys = ON'); console.error(e.message); process.exit(1); }
db.close();
