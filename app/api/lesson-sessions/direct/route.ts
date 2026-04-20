import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isLessonStaff } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { createDirectLessonSession, addOneHour } from '@/lib/lesson-queries';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!(await isLessonStaff())) {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const entitlementId = body.entitlementId as string;
    const courtId = body.courtId as string;
    const date = body.date as string;
    const slotStart = body.slotStart as string;
    const maestroUserId = body.maestroUserId as string;
    if (!entitlementId || !courtId || !date || !slotStart || !maestroUserId) {
      return NextResponse.json(
        { success: false, error: 'entitlementId, courtId, date, slotStart, maestroUserId richiesti' },
        { status: 400 }
      );
    }
    const slotEnd = addOneHour(slotStart);
    const result = createDirectLessonSession({
      entitlementId,
      courtId,
      date,
      slotStart,
      slotEnd,
      maestroUserId,
      createdByUserId: user.id,
    });
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: '/api/lesson-sessions/direct',
      details: JSON.stringify({ action: 'direct_lesson', ...result }),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
