/**
 * One-off: aggiorna nickname da "Valerio (Veca)" a "Valerio" nel DB esistente.
 * Uso: node scripts/update-valerio.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'padel.db');

if (!fs.existsSync(dbPath)) {
  console.log('Database non trovato:', dbPath);
  process.exit(0);
}

const db = new Database(dbPath);
const r = db.prepare('UPDATE users SET username = ? WHERE username = ?').run('Valerio', 'Valerio (Veca)');
console.log('Aggiornato username a "Valerio" per', r.changes, 'utente/i.');
db.close();
