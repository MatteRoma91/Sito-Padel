import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getSecurityLogs, deleteSecurityLogs, deleteSecurityLogsBefore } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') as 'login_failed' | 'auth_401' | 'auth_403' | 'admin_access' | null;
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;
  const since = searchParams.get('since') || undefined;

  const { logs, total } = getSecurityLogs({
    type: type || undefined,
    limit,
    offset,
    since,
  });

  return NextResponse.json({ logs, total });
}

export async function DELETE(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (body.ids && Array.isArray(body.ids)) {
      const ids = body.ids.filter((n: unknown) => typeof n === 'number');
      const deleted = deleteSecurityLogs(ids);
      return NextResponse.json({ success: true, deleted });
    }
    if (body.before && typeof body.before === 'string') {
      const deleted = deleteSecurityLogsBefore(body.before);
      return NextResponse.json({ success: true, deleted });
    }
    return NextResponse.json({ error: 'Fornire ids (array) o before (string ISO)' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Errore durante la cancellazione' }, { status: 500 });
  }
}
