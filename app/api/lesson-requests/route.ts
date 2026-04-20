import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isLessonStaff } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import {
  createLessonRequest,
  listLessonRequestsForStaff,
  listLessonRequestsForUser,
} from '@/lib/lesson-queries';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'cancelled' | null;

  if (await isLessonStaff()) {
    const requests = listLessonRequestsForStaff(status ?? undefined);
    return NextResponse.json({ requests });
  }
  if (user.role === 'guest') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  const requests = listLessonRequestsForUser(user.id);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role === 'guest') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const entitlementId = body.entitlementId as string;
    const preferredStart = body.preferredStart as string;
    if (!entitlementId || !preferredStart) {
      return NextResponse.json(
        { success: false, error: 'entitlementId e preferredStart richiesti' },
        { status: 400 }
      );
    }
    const id = createLessonRequest({
      entitlementId,
      requesterUserId: user.id,
      preferredStartIso: preferredStart,
    });
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: '/api/lesson-requests',
      details: JSON.stringify({ action: 'create_request', id }),
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
