import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 100;
const AUTH_WINDOW_MS = 5 * 60 * 1000;
const AUTH_MAX = 20;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const store = new Map<string, { count: number; resetAt: number }>();
const authStore = new Map<string, { count: number; resetAt: number }>();
const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_PREFIX = process.env.RATE_LIMIT_PREFIX || 'padel:rl:';

setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now >= entry.resetAt) store.delete(key);
  });
}, CLEANUP_INTERVAL_MS);

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkApiRateLimit(req: NextRequest): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

function checkAuthRateLimit(req: NextRequest): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = authStore.get(`auth:${ip}`);
  if (!entry) {
    authStore.set(`auth:${ip}`, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }
  if (now >= entry.resetAt) {
    authStore.set(`auth:${ip}`, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= AUTH_MAX;
}

async function incrementRedisCounter(key: string, windowMs: number): Promise<number | null> {
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) return null;
  try {
    const encodedKey = encodeURIComponent(`${REDIS_PREFIX}${key}`);
    const authHeader = { Authorization: `Bearer ${REDIS_REST_TOKEN}` };
    const incrRes = await fetch(`${REDIS_REST_URL}/incr/${encodedKey}`, { headers: authHeader, cache: 'no-store' });
    if (!incrRes.ok) return null;
    const incrJson = await incrRes.json();
    const count = Number(incrJson?.result ?? 0);
    if (count === 1) {
      const ttlSeconds = Math.ceil(windowMs / 1000);
      await fetch(`${REDIS_REST_URL}/expire/${encodedKey}/${ttlSeconds}`, { headers: authHeader, cache: 'no-store' });
    }
    return count;
  } catch {
    return null;
  }
}

async function allowOrReject(req: NextRequest, key: string, max: number, windowMs: number): Promise<boolean> {
  const redisCount = await incrementRedisCounter(key, windowMs);
  if (redisCount !== null) return redisCount <= max;
  return key.startsWith('auth:') ? checkAuthRateLimit(req) : checkApiRateLimit(req);
}

setInterval(() => {
  const now = Date.now();
  authStore.forEach((entry, key) => {
    if (now >= entry.resetAt) authStore.delete(key);
  });
}, CLEANUP_INTERVAL_MS);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Percorsi pubblici (login, cambio password, install, sitemap, robots)
  if (
    pathname === '/login' ||
    pathname === '/change-password' ||
    pathname === '/install' ||
    pathname.startsWith('/api/install-file') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth')
  ) {
    if (pathname === '/api/auth/login') {
      const ip = getClientIp(request);
      if (!(await allowOrReject(request, `auth:${ip}`, AUTH_MAX, AUTH_WINDOW_MS))) {
        return NextResponse.json(
          { error: 'Troppi tentativi. Riprova tra 5 minuti.' },
          { status: 429 }
        );
      }
    }
    return NextResponse.next();
  }

  // Rate limit sulle API (tranne auth che ha già rate limit login)
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(request);
    if (!(await allowOrReject(request, `api:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS))) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra un minuto.' },
        { status: 429 }
      );
    }
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('padel-session');

  // Se non c'è il cookie di sessione, redirect a login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Escludi static, sitemap, robots - middleware non li intercetta
    '/((?!_next/static|_next/image|favicon.ico|logo\\.png|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
