import { NextResponse } from 'next/server';
import { getCurrentUser, getClientIp, isLessonStaff } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import {
  listLessonEntitlementsForStaff,
  listLessonEntitlementsForPlayer,
  createLessonEntitlement,
} from '@/lib/lesson-queries';
import type { LessonEntitlementKind } from '@/lib/types';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (await isLessonStaff()) {
    const entitlements = listLessonEntitlementsForStaff();
    return NextResponse.json({ entitlements });
  }
  if (user.role === 'guest') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  const entitlements = listLessonEntitlementsForPlayer(user.id);
  return NextResponse.json({ entitlements });
}

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
    const kind = body.kind as LessonEntitlementKind;
    const primaryUserId = body.primaryUserId as string;
    const partnerUserId = body.partnerUserId as string | undefined;
    if (kind !== 'private' && kind !== 'pair') {
      return NextResponse.json({ success: false, error: 'kind deve essere private o pair' }, { status: 400 });
    }
    if (!primaryUserId) {
      return NextResponse.json({ success: false, error: 'primaryUserId richiesto' }, { status: 400 });
    }
    const id = createLessonEntitlement({
      kind,
      primaryUserId,
      partnerUserId: kind === 'pair' ? partnerUserId ?? null : null,
      assignedByUserId: user.id,
    });
    logSecurityEvent({
      type: 'lesson_event',
      ip: getClientIp(request),
      username: user.username,
      path: '/api/lesson-entitlements',
      details: JSON.stringify({ action: 'create_entitlement', id }),
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
