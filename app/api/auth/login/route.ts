import { NextResponse } from 'next/server';
import { login, getClientIp } from '@/lib/auth';
import { getLoginAttempts, recordLoginFailure, recordLoginSuccess } from '@/lib/db/queries';
import { loginSchema, parseOrThrow } from '@/lib/validations';

const BLOCKED_MESSAGE =
  "Accesso temporaneamente bloccato per troppi tentativi errati. Riprova tra circa un'ora, oppure contatta l'amministratore per uno sblocco anticipato.";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const { username, password } = parseOrThrow(loginSchema, body);

    // Verifica se (IP + username) è bloccato (blocco per profilo, non per IP)
    const attempts = getLoginAttempts(ip, username);
    if (attempts?.locked_until && new Date(attempts.locked_until) > new Date()) {
      return NextResponse.json({ success: false, error: BLOCKED_MESSAGE }, { status: 403 });
    }

    const result = await login(username, password);

    if (result.success) {
      recordLoginSuccess(ip, username);
      return NextResponse.json({ success: true, mustChangePassword: result.mustChangePassword });
    } else {
      recordLoginFailure(ip, username);
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
