import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, dbPath } from '@/lib/db/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PassThrough } from 'stream';
import { Readable } from 'stream';
import archiver from 'archiver';

function canManageSettings(_username: string, role: string): boolean {
  return role === 'admin';
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (!canManageSettings(user.username, user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({ error: 'Database non trovato' }, { status: 404 });
  }

  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
  const tempDbPath = path.join(os.tmpdir(), `padel-backup-${Date.now()}.db`);

  try {
    const db = getDb();
    await (db as unknown as { backup: (p: string) => Promise<void> }).backup(tempDbPath);
  } catch (error) {
    console.error('Backup DB error:', error);
    return NextResponse.json({ error: 'Errore durante il backup del database' }, { status: 500 });
  }

  const filename = `padel-full-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  const pass = new PassThrough();

  const cleanup = () => {
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    } catch {
      // ignore
    }
  };

  pass.on('end', cleanup);
  pass.on('error', cleanup);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    cleanup();
  });
  archive.pipe(pass);

  archive.file(tempDbPath, { name: 'padel.db' });
  if (fs.existsSync(avatarsDir)) {
    archive.directory(avatarsDir, 'avatars');
  }
  // Do NOT await finalize(): the client must read the response body for the stream to flow.
  // Awaiting here would deadlock (archiver blocks until someone reads from pass).
  archive.finalize();
  const webStream = Readable.toWeb(pass) as ReadableStream;
  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
