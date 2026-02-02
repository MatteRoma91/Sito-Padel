import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'padel.db');

// Crea la directory se non esiste
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}
