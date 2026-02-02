import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserById, resetUserPassword } from '@/lib/db/queries';

export async function POST(
  _request: Request,
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

  resetUserPassword(id);
  return NextResponse.json({ success: true });
}
