import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { dbPath } from '@/lib/db/db';
import fs from 'fs';

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

  try {
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database non trovato' }, { status: 404 });
    }
    const buffer = fs.readFileSync(dbPath);
    const filename = `padel-backup-${new Date().toISOString().slice(0, 10)}.db`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Errore durante il backup' }, { status: 500 });
  }
}
