import { NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getClientIp } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/db/queries';
import { getLessonEntitlementById, deleteLessonEntitlement, listConsumptionsForEntitlement } from '@/lib/lesson-queries';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  const { id } = await params;
  const ent = getLessonEntitlementById(id);
  if (!ent) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  }
  const isOwner = ent.primary_user_id === user.id || ent.partner_user_id === user.id;
  const staff = user.role === 'admin' || user.role === 'maestro';
  if (!staff && !isOwner) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  const consumptions = listConsumptionsForEntitlement(id);
  return NextResponse.json({ entitlement: ent, consumptions });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: 'Solo admin può eliminare un carnet' }, { status: 403 });
  }
  const { id } = await params;
  const ent = getLessonEntitlementById(id);
  if (!ent) {
    return NextResponse.json({ success: false, error: 'Non trovato' }, { status: 404 });
  }
  deleteLessonEntitlement(id);
  logSecurityEvent({
    type: 'lesson_event',
    ip: getClientIp(request),
    username: user.username,
    path: `/api/lesson-entitlements/${id}`,
    details: JSON.stringify({ action: 'delete_entitlement', id }),
  });
  return NextResponse.json({ success: true });
}
