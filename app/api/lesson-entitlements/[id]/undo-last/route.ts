import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isAdmin } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { undoLastLessonConsumption } from '@/lib/lesson-queries';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: 'Solo admin può annullare l\'ultima lezione' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const result = undoLastLessonConsumption({ entitlementId: id });
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: `/api/lesson-entitlements/${id}/undo-last`,
      details: JSON.stringify({ action: 'undo_last', ...result }),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
