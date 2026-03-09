import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filename = pathSegments?.join('/');
  if (!filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filepath = path.join(AVATARS_DIR, filename);
  const resolved = path.resolve(filepath);
  const base = path.resolve(AVATARS_DIR);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const ext = path.extname(filename).toLowerCase();

  if (!MIME_TYPES[ext] || !existsSync(filepath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = await readFile(filepath);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': MIME_TYPES[ext],
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
