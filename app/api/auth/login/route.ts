import { NextResponse } from 'next/server';
import { login, getClientIp } from '@/lib/auth';
import { getLoginAttempts, recordLoginFailure, recordLoginSuccess } from '@/lib/db/queries';

const BLOCKED_MESSAGE =
  "Accesso temporaneamente bloccato per troppi tentativi errati. Riprova tra circa un'ora, oppure contatta l'amministratore per uno sblocco anticipato.";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username e password richiesti' }, { status: 400 });
    }

    // Verifica se l'IP è bloccato
    const attempts = getLoginAttempts(ip);
    if (attempts?.locked_until && new Date(attempts.locked_until) > new Date()) {
      return NextResponse.json({ success: false, error: BLOCKED_MESSAGE }, { status: 403 });
    }

    const result = await login(username, password);

    if (result.success) {
      recordLoginSuccess(ip);
      return NextResponse.json({ success: true, mustChangePassword: result.mustChangePassword });
    } else {
      recordLoginFailure(ip, username);
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
