import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSiteConfig, setSiteConfig, seedSiteConfig } from '@/lib/db/queries';
import { settingsPatchSchema, parseOrThrow, ValidationError } from '@/lib/validations';

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
    let data: { action?: 'seed'; [k: string]: string | number | boolean | undefined };
    try {
      data = parseOrThrow(settingsPatchSchema, body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    if (data.action === 'seed') {
      seedSiteConfig();
      return NextResponse.json({ success: true });
    }

    for (const [key, value] of Object.entries(data)) {
      if (key === 'action') continue;
      if (typeof value === 'string') {
        setSiteConfig(key, value);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH settings error:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
