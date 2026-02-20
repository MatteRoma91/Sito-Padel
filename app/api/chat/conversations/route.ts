import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConversationsForUser, getAllConversationsForAdmin, getParticipantIds, getOrCreateDmConversation, getOrCreateTournamentConversation, getOrCreateBroadcastConversation, isParticipant, ensureTournamentParticipant } from '@/lib/db/chat-queries';
import { getTournamentById, getUsers } from '@/lib/db/queries';
import { parseOrThrow, createDmSchema, ValidationError } from '@/lib/validations';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const convs = user.role === 'admin' ? getAllConversationsForAdmin() : getConversationsForUser(user.id);
  const allUsers = getUsers();
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  const enriched = convs.map(c => {
    let title = '';
    let otherUser = null;
    let tournament = null;

    if (c.type === 'broadcast') {
      title = 'Chat con tutti';
    } else if (c.type === 'dm') {
      const ids = getParticipantIds(c.id);
      const otherId = ids.find(id => id !== user.id);
      if (otherId) {
        otherUser = userMap.get(otherId);
        title = otherUser ? (otherUser.nickname || otherUser.full_name || otherUser.username) : 'Utente';
      } else if (ids.length === 2) {
        const u1 = userMap.get(ids[0]);
        const u2 = userMap.get(ids[1]);
        title = [u1, u2].map(u => u?.nickname || u?.full_name || u?.username || '?').join(' / ');
      }
    } else if (c.tournament_id) {
      const t = getTournamentById(c.tournament_id);
      tournament = t ? { id: t.id, name: t.name } : null;
      title = t?.name ?? 'Torneo';
    }

    return {
      id: c.id,
      type: c.type,
      tournament_id: c.tournament_id,
      title,
      otherUser: otherUser ? { id: otherUser.id, full_name: otherUser.full_name, nickname: otherUser.nickname } : null,
      tournament,
      last_message_at: c.last_message_at,
    };
  });

  return NextResponse.json({ success: true, conversations: enriched });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = parseOrThrow(createDmSchema, body);

    if (parsed.other_user_id) {
      if (parsed.other_user_id === user.id) {
        return NextResponse.json({ success: false, error: 'Non puoi creare una chat con te stesso' }, { status: 400 });
      }
      const conv = getOrCreateDmConversation(user.id, parsed.other_user_id);
      return NextResponse.json({ success: true, conversation: { id: conv.id, type: 'dm' } });
    }

    if (parsed.tournament_id) {
      const conv = getOrCreateTournamentConversation(parsed.tournament_id);
      ensureTournamentParticipant(conv.id, user.id);
      if (!isParticipant(conv.id, user.id)) {
        return NextResponse.json({ success: false, error: 'Non sei partecipante di questo torneo' }, { status: 403 });
      }
      return NextResponse.json({ success: true, conversation: { id: conv.id, type: 'tournament', tournament_id: conv.tournament_id } });
    }

    if (parsed.broadcast) {
      const conv = getOrCreateBroadcastConversation();
      return NextResponse.json({ success: true, conversation: { id: conv.id, type: 'broadcast' } });
    }

    return NextResponse.json({ success: false, error: 'Fornire other_user_id, tournament_id o broadcast' }, { status: 400 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    throw e;
  }
}
