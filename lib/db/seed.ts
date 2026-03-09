import { getDb } from './db';
import bcrypt from 'bcrypt';
import { randomUUID, randomBytes } from 'crypto';
import { BCRYPT_ROUNDS } from '../constants';

export function seed() {
  const db = getDb();

  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (row.count > 0) return;

  try {
    const id = randomUUID();
    const generatedPassword = randomBytes(12).toString('base64url').slice(0, 16);
    const passwordHash = bcrypt.hashSync(generatedPassword, BCRYPT_ROUNDS);
    db.prepare(
      `INSERT INTO users (id, username, password_hash, full_name, nickname, role, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(id, 'admin', passwordHash, 'Amministratore', 'Admin', 'admin');
    console.log('=== ADMIN INIZIALE CREATO ===');
    console.log(`Username: admin`);
    console.log(`Password: ${generatedPassword}`);
    console.log('CAMBIA LA PASSWORD AL PRIMO ACCESSO!');
    console.log('=============================');
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.message?.includes('UNIQUE constraint')) {
      return;
    }
    throw e;
  }
}
