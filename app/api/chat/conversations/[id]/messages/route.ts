import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMessages, insertMessage, isParticipant } from '@/lib/db/chat-queries';
import { getUsers } from '@/lib/db/queries';
import { parseOrThrow, chatMessageSchema, ValidationError } from '@/lib/validations';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  if (!isParticipant(conversationId, user.id)) {
    return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100);
  const before = searchParams.get('before') || undefined;

  const messages = getMessages(conversationId, limit, before);
  const allUsers = getUsers();
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const enriched = messages.map(m => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    sender_name: (userMap.get(m.sender_id)?.nickname || userMap.get(m.sender_id)?.full_name || userMap.get(m.sender_id)?.username) ?? '?',
    body: m.body,
    created_at: m.created_at,
  }));

  return NextResponse.json({ success: true, messages: enriched.reverse() });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  if (!isParticipant(conversationId, user.id)) {
    return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { body: messageBody } = parseOrThrow(chatMessageSchema, body);

    const msg = insertMessage(conversationId, user.id, messageBody);
    const senderName = user.nickname || user.full_name || user.username || 'Utente';
    return NextResponse.json({
      success: true,
      message: {
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        sender_name: senderName,
        body: msg.body,
        created_at: msg.created_at,
      },
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message === 'User is not a participant of this conversation') {
      return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
    }
    if (e instanceof Error && e.message === 'Message body cannot be empty') {
      return NextResponse.json({ success: false, error: 'Il messaggio non può essere vuoto' }, { status: 400 });
    }
    throw e;
  }
}
