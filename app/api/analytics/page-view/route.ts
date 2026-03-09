import { NextRequest, NextResponse } from 'next/server';
import { recordPageView } from '@/lib/db/queries';
import { getClientIp } from '@/lib/auth';

// Rate limit: 1 req per path per IP per 60 seconds (in-memory)
const store = new Map<string, number>();
const WINDOW_MS = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now - v > WINDOW_MS) store.delete(k);
  }
}, 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = typeof body.path === 'string' ? body.path.trim() : null;
    if (!path || path.length > 500) {
      return NextResponse.json({ error: 'path richiesto' }, { status: 400 });
    }
    // Escludi path non significativi
    if (path.startsWith('/_next') || path.startsWith('/api')) {
      return NextResponse.json({ ok: true });
    }
    const ip = getClientIp(request);
    const key = `${ip}:${path}`;
    const last = store.get(key);
    const now = Date.now();
    if (last && now - last < WINDOW_MS) {
      return NextResponse.json({ ok: true });
    }
    store.set(key, now);
    recordPageView(path);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Errore' }, { status: 500 });
  }
}
