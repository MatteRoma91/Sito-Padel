import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isLessonStaff } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { consumeLessonManual } from '@/lib/lesson-queries';

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
    const consumedAtIso = body.consumedAt as string;
    const manualReason = (body.manualReason as string) || '';
    const maestroUserId = (body.maestroUserId as string | null) ?? null;
    const notes = (body.notes as string | null) ?? null;
    if (!consumedAtIso) {
      return NextResponse.json({ success: false, error: 'consumedAt richiesto (ISO)' }, { status: 400 });
    }
    if (!manualReason.trim()) {
      return NextResponse.json({ success: false, error: 'manualReason obbligatorio' }, { status: 400 });
    }
    const { id } = await params;
    const result = consumeLessonManual({
      entitlementId: id,
      consumedAtIso,
      maestroUserId,
      manualReason,
      notes,
      actorId: user.id,
    });
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: `/api/lesson-entitlements/${id}/consume-manual`,
      details: JSON.stringify({ action: 'manual_consume', consumptionId: result.consumptionId }),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
