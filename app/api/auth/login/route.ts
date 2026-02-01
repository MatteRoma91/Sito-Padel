import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username e password richiesti' }, { status: 400 });
    }

    const result = await login(username, password);
    
    if (result.success) {
      return NextResponse.json({ success: true, mustChangePassword: result.mustChangePassword });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
