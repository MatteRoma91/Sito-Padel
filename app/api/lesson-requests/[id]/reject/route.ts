import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isLessonStaff } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { rejectLessonRequest } from '@/lib/lesson-queries';

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
    const body = await request.json().catch(() => ({}));
    const reason = (body.reason as string) || null;
    const { id } = await params;
    rejectLessonRequest(id, user.id, reason);
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: `/api/lesson-requests/${id}/reject`,
      details: JSON.stringify({ action: 'reject', id }),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
