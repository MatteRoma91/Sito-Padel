/**
 * Rate limiter in-memory per API.
 * Limite: 100 richieste per IP per finestra di 1 minuto.
 * Per ambienti multi-istanza considerare Redis (es. @upstash/ratelimit).
 */

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 100;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function checkRateLimit(request: Request): { ok: boolean; remaining: number } {
  const ip = getClientIp(request);
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
    return { ok: true, remaining: MAX_REQUESTS - 1 };
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
    return { ok: true, remaining: MAX_REQUESTS - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return { ok: entry.count <= MAX_REQUESTS, remaining };
}

/** Pulizia periodica delle entry scadute (evita memory leak) */
export function cleanupExpired(): void {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now >= entry.resetAt) store.delete(key);
  });
}
