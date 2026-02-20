#!/usr/bin/env node
/**
 * One-time fix for chat_conversations migration to add 'group' type.
 * Run: node scripts/fix-chat-group-migration.mjs
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'padel.db');
const db = new Database(dbPath);

const oldExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_chat_conv_old'").get();
const checkResult = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_conversations'").get();
const hasGroup = checkResult?.sql?.includes("'group'") ?? false;

console.log('State:', { oldExists: !!oldExists, hasGroup, chatExists: !!checkResult });

if (hasGroup) {
  if (oldExists) {
    db.exec(`DROP TABLE _chat_conv_old`);
    console.log('Dropped leftover _chat_conv_old');
  }
  console.log('Migration already applied.');
  db.close();
  process.exit(0);
}

db.exec(`BEGIN`);
try {
  if (oldExists) {
    console.log('Recovery: using _chat_conv_old as source');
    db.exec(`PRAGMA foreign_keys = OFF`);
    db.exec(`DROP TABLE IF EXISTS chat_conversations`);
    db.exec(`
      CREATE TABLE chat_conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('dm', 'tournament', 'broadcast', 'group')),
        tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`INSERT INTO chat_conversations SELECT id, type, tournament_id, created_at FROM _chat_conv_old`);
    db.exec(`DROP TABLE _chat_conv_old`);
    db.exec(`PRAGMA foreign_keys = ON`);
  } else if (checkResult?.sql) {
    console.log('Normal migration: chat_conversations -> _chat_conv_old -> new chat_conversations');
    db.exec(`ALTER TABLE chat_conversations RENAME TO _chat_conv_old`);
    db.exec(`
      CREATE TABLE chat_conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('dm', 'tournament', 'broadcast', 'group')),
        tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`INSERT INTO chat_conversations SELECT id, type, tournament_id, created_at FROM _chat_conv_old`);
    db.exec(`DROP TABLE _chat_conv_old`);
  }
  db.exec(`COMMIT`);
  console.log('Migration completed successfully.');
} catch (e) {
  db.exec(`ROLLBACK`);
  db.exec(`PRAGMA foreign_keys = ON`);
  console.error('Migration failed:', e);
  db.close();
  process.exit(1);
}
db.close();
