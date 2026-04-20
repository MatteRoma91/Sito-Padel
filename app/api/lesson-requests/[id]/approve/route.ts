import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isLessonStaff } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { approveLessonRequest, addOneHour } from '@/lib/lesson-queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!(await isLessonStaff())) {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const courtId = body.courtId as string;
    const date = body.date as string;
    const slotStart = body.slotStart as string;
    const maestroUserId = body.maestroUserId as string;
    if (!courtId || !date || !slotStart || !maestroUserId) {
      return NextResponse.json(
        { success: false, error: 'courtId, date, slotStart, maestroUserId richiesti' },
        { status: 400 }
      );
    }
    const slotEnd = addOneHour(slotStart);
    const { id } = await params;
    const result = approveLessonRequest({
      requestId: id,
      courtId,
      date,
      slotStart,
      slotEnd,
      maestroUserId,
      reviewedByUserId: user.id,
    });
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: `/api/lesson-requests/${id}/approve`,
      details: JSON.stringify({ action: 'approve', ...result }),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
