import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const GALLERY_DIR = path.join(process.cwd(), 'public', 'gallery');

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
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

  const filepath = path.join(GALLERY_DIR, filename);
  const ext = path.extname(filename).toLowerCase();

  if (!MIME_TYPES[ext] || !existsSync(filepath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = await readFile(filepath);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': MIME_TYPES[ext],
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
