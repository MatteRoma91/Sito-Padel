import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSiteConfig, setSiteConfig, seedSiteConfig } from '@/lib/db/queries';

function canManageSettings(_username: string, role: string): boolean {
  return role === 'admin';
}

export async function GET() {
  try {
    const config = getSiteConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (!canManageSettings(user.username, user.role)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (body.action === 'seed') {
      seedSiteConfig();
      return NextResponse.json({ success: true });
    }

    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      for (const [key, value] of Object.entries(body)) {
        if (key === 'action') continue;
        if (typeof value === 'string') {
          setSiteConfig(key, value);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  } catch (error) {
    console.error('PATCH settings error:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
