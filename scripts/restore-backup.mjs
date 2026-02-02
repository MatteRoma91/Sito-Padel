#!/usr/bin/env node
/**
 * Ripristina un backup completo (ZIP con padel.db + avatars/) generato da
 * GET /api/settings/backup/full.
 *
 * Uso: node scripts/restore-backup.mjs /path/to/padel-full-backup-YYYY-MM-DD.zip
 *
 * Eseguire preferibilmente con l'app ferma (es. pm2 stop padel-tour).
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Uso: node scripts/restore-backup.mjs /path/to/padel-full-backup-YYYY-MM-DD.zip');
  process.exit(1);
}

if (!fs.existsSync(zipPath)) {
  console.error('File non trovato:', zipPath);
  process.exit(1);
}

const projectRoot = path.resolve(path.join(__dirname, '..'));
const dbDest = process.env.DATABASE_PATH || path.join(projectRoot, 'data', 'padel.db');
const dataDir = path.dirname(dbDest);
const avatarsDest = path.join(projectRoot, 'public', 'avatars');

const tempDir = path.join(os.tmpdir(), `padel-restore-${Date.now()}`);

try {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tempDir, true);

  const extractedDb = path.join(tempDir, 'padel.db');
  if (!fs.existsSync(extractedDb)) {
    console.error('Archivio non valido: manca padel.db');
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.copyFileSync(extractedDb, dbDest);
  console.log('Database ripristinato:', dbDest);

  const extractedAvatars = path.join(tempDir, 'avatars');
  if (fs.existsSync(extractedAvatars)) {
    if (!fs.existsSync(avatarsDest)) {
      fs.mkdirSync(avatarsDest, { recursive: true });
    }
    const entries = fs.readdirSync(extractedAvatars, { withFileTypes: true });
    for (const e of entries) {
      const src = path.join(extractedAvatars, e.name);
      const dest = path.join(avatarsDest, e.name);
      if (e.isDirectory()) {
        copyDirSync(src, dest);
      } else {
        fs.copyFileSync(src, dest);
      }
    }
    console.log('Avatar ripristinati in:', avatarsDest);
  }

  console.log('\nRipristino completato. Riavvia l\'applicazione (es. pm2 restart padel-tour).');
} catch (err) {
  console.error('Errore durante il ripristino:', err.message);
  process.exit(1);
} finally {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
