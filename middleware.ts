import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Percorsi pubblici
  if (pathname === '/login' || pathname === '/change-password' || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Le API gestiscono l'auth autonomamente (ritornano 401 JSON)
  if (pathname.startsWith('/api/')) {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
