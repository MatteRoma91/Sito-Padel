/**
 * Script per aggiungere i giocatori iniziali
 * Uso: node scripts/add-players.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

const DEFAULT_PASSWORD = 'Padel123';

const players = [
  { username: 'mich', nickname: 'Mich' },
  { username: 'sax', nickname: 'Sax' },
  { username: 'matteo.piera', nickname: 'Matteo Piera' },
  { username: 'cora', nickname: 'Cora' },
  { username: 'jullios', nickname: 'Jullios' },
  { username: 'faber', nickname: 'Faber' },
  { username: 'marco', nickname: 'Marco' },
  { username: 'braccio', nickname: 'Braccio' },
  { username: 'porra', nickname: 'Porra' },
  { username: 'fabio', nickname: 'Fabio' },
  { username: 'dile', nickname: 'Dile' },
  { username: 'david', nickname: 'David' },
  { username: 'scimmia', nickname: 'Scimmia' },
  { username: 'valerio', nickname: 'Valerio (Veca)' },
  { username: 'merzio', nickname: 'Merzio' },
  { username: 'danti', nickname: 'Danti' },
  { username: 'ema.baldi', nickname: 'Ema Baldi' },
];

async function main() {
  const dbPath = path.join(__dirname, '..', 'data', 'padel.db');
  
  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Connessione al database:', dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Check if users table exists with the new columns
  try {
    db.prepare('SELECT avatar, must_change_password FROM users LIMIT 1').get();
  } catch (e) {
    console.log('Aggiunta nuove colonne al database...');
    try {
      db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
    } catch { /* column exists */ }
    try {
      db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
    } catch { /* column exists */ }
  }

  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

  console.log(`\nAggiunta di ${players.length} giocatori...`);
  console.log(`Password predefinita: ${DEFAULT_PASSWORD}`);
  console.log('');

  let added = 0;
  let skipped = 0;

  for (const player of players) {
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(player.username);
    
    if (existing) {
      console.log(`⏭️  ${player.nickname} (@${player.username}) - già esistente`);
      skipped++;
      continue;
    }

    const id = randomUUID();
    db.prepare(
      `INSERT INTO users (id, username, password_hash, nickname, role, must_change_password)
       VALUES (?, ?, ?, ?, 'player', 1)`
    ).run(id, player.username, passwordHash, player.nickname);

    console.log(`✅ ${player.nickname} (@${player.username}) - aggiunto`);
    added++;
  }

  db.close();

  console.log('');
  console.log(`Completato! Aggiunti: ${added}, Saltati: ${skipped}`);
  console.log('');
  console.log('Tutti i nuovi giocatori dovranno cambiare la password al primo accesso.');
}

main().catch(console.error);
