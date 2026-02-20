import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserById, resetUserPassword } from '@/lib/db/queries';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z.string().max(128).optional().transform((v) => (typeof v === 'string' ? v.trim() : '') || undefined),
}).refine(
  (v) => v.password === undefined || v.password.length >= 6,
  { message: 'La password deve essere di almeno 6 caratteri', path: ['password'] }
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const canReset = currentUser.role === 'admin';
  if (!canReset) {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  const user = getUserById(id);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Dati non validi';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
  const newPassword = parsed.data.password;

  resetUserPassword(id, newPassword);
  return NextResponse.json({ success: true });
}
