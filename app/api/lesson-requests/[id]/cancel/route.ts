import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { cancelLessonRequestByUser } from '@/lib/lesson-queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  const { id } = await params;
  const ok = cancelLessonRequestByUser(id, user.id);
  if (!ok) {
    return NextResponse.json({ success: false, error: 'Richiesta non annullabile' }, { status: 400 });
  }
  logSecurityEvent({
    type: 'lesson_event',
    ip: getClientIp(request),
    username: user.username,
    path: `/api/lesson-requests/${id}/cancel`,
    details: JSON.stringify({ action: 'cancel_request', id }),
  });
  return NextResponse.json({ success: true });
}
