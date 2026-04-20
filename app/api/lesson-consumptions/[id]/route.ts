import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { getLessonConsumptionById, updateLessonConsumptionNotes } from '@/lib/lesson-queries';
import { lessonConsumptionNotesPatchSchema, parseOrThrow, ValidationError } from '@/lib/validations';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const { id: consumptionId } = await params;
  const existing = getLessonConsumptionById(consumptionId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Non trovato' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { notes } = parseOrThrow(lessonConsumptionNotesPatchSchema, body);

    updateLessonConsumptionNotes({
      consumptionId,
      notes,
      actorUserId: user.id,
      actorRole: user.role,
    });

    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: `/api/lesson-consumptions/${consumptionId}`,
      details: JSON.stringify({ action: 'update_consumption_notes', consumptionId }),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Errore';
    const status = msg === 'Non autorizzato' ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
