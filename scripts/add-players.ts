/**
 * Script per aggiungere i giocatori iniziali
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/add-players.ts
 * O dopo build: node -e "require('./scripts/add-players-compiled.js')"
 */

import { getDb } from '../lib/db/db';
import { initSchema } from '../lib/db/schema';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { BCRYPT_ROUNDS } from '../lib/constants';

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
  { username: 'valerio', nickname: 'Valerio' },
  { username: 'merzio', nickname: 'Merzio' },
  { username: 'danti', nickname: 'Danti' },
  { username: 'ema.baldi', nickname: 'Ema Baldi' },
];

async function main() {
  console.log('Inizializzazione database...');
  initSchema();

  const db = getDb();
  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

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

  console.log('');
  console.log(`Completato! Aggiunti: ${added}, Saltati: ${skipped}`);
  console.log('');
  console.log('Tutti i nuovi giocatori dovranno cambiare la password al primo accesso.');
}

main().catch(console.error);
