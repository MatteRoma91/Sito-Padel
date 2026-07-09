/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Pre-warm SQLite connection at custom server startup.
 * Does not run schema init/seed (handled by Next.js on first request).
 */
function ensureDb() {
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'padel.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.prepare('SELECT 1').get();
  } finally {
    db.close();
  }
}

module.exports = { ensureDb };
