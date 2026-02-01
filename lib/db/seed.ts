import { getDb } from './db';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export function seed() {
  const db = getDb();

  // Controlla se ci sono già utenti
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (row.count > 0) return;

  // Crea admin iniziale
  try {
    const id = randomUUID();
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      `INSERT INTO users (id, username, password_hash, full_name, nickname, role)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, 'admin', passwordHash, 'Amministratore', 'Admin', 'admin');
    console.log('Admin creato: username=admin, password=admin123');
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.message?.includes('UNIQUE constraint')) {
      return;
    }
    throw e;
  }
}
