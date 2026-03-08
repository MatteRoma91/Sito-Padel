import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { markConversationAsRead, isParticipant } from '@/lib/db/chat-queries';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(user)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }

  if (!isParticipant(conversationId, user.id)) {
    return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
  }

  markConversationAsRead(conversationId, user.id);
  return NextResponse.json({ success: true });
}
