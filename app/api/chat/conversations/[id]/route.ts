import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getConversationById, getParticipantIds, isParticipant, deleteConversation } from '@/lib/db/chat-queries';
import { getTournamentById, getUsers } from '@/lib/db/queries';
import { canSeeHiddenUsers } from '@/lib/visibility';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Solo gli admin possono eliminare chat' }, { status: 403 });
  }

  const conv = getConversationById(conversationId);
  if (!conv) {
    return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
  }

  deleteConversation(conversationId);
  return NextResponse.json({ success: true });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const conv = getConversationById(conversationId);
  if (!conv) {
    return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
  }

  if (user.role !== 'admin' && !isParticipant(conversationId, user.id)) {
    return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
  }

  const participantIds = getParticipantIds(conversationId);
  const allUsers = getUsers();
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const hiddenIds = canSeeHiddenUsers(user) ? [] : allUsers.filter(u => u.is_hidden).map(u => u.id);

  let title = '';
  let participants: Array<{ id: string; full_name: string | null; nickname: string | null }> = [];
  let tournament: { id: string; name: string } | null = null;

  if (conv.type === 'broadcast') {
    title = 'Chat con tutti';
    participants = participantIds
      .filter(pid => !hiddenIds.includes(pid))
      .map(pid => {
        const u = userMap.get(pid);
        return u ? { id: u.id, full_name: u.full_name, nickname: u.nickname } : null;
      })
      .filter(Boolean) as Array<{ id: string; full_name: string | null; nickname: string | null }>;
  } else if (conv.type === 'dm') {
    const otherId = participantIds.find(pid => pid !== user.id);
    const other = otherId ? userMap.get(otherId) : null;
    if (otherId && hiddenIds.includes(otherId)) {
      return NextResponse.json({ success: false, error: 'Conversazione non trovata' }, { status: 404 });
    }
    if (other) {
      title = other.nickname || other.full_name || other.username;
      participants = [{ id: other.id, full_name: other.full_name, nickname: other.nickname }];
    } else if (participantIds.length === 2) {
      const u1 = userMap.get(participantIds[0]);
      const u2 = userMap.get(participantIds[1]);
      title = [u1, u2].map(u => u?.nickname || u?.full_name || u?.username || '?').join(' / ');
      participants = participantIds
        .filter(pid => !hiddenIds.includes(pid))
        .map(pid => {
          const u = userMap.get(pid);
          return u ? { id: u.id, full_name: u.full_name, nickname: u.nickname } : null;
        })
        .filter(Boolean) as Array<{ id: string; full_name: string | null; nickname: string | null }>;
    } else {
      title = 'Utente';
      participants = [];
    }
  } else if (conv.type === 'group') {
    const names = participantIds
      .filter(pid => !hiddenIds.includes(pid))
      .map(pid => {
        const u = userMap.get(pid);
        return u?.nickname || u?.full_name || u?.username || '?';
      });
    title = names.join(', ');
    participants = participantIds
      .filter(pid => !hiddenIds.includes(pid))
      .map(pid => {
        const u = userMap.get(pid);
        return u ? { id: u.id, full_name: u.full_name, nickname: u.nickname } : null;
      })
      .filter(Boolean) as Array<{ id: string; full_name: string | null; nickname: string | null }>;
  } else if (conv.tournament_id) {
    const t = getTournamentById(conv.tournament_id);
    tournament = t ? { id: t.id, name: t.name } : null;
    title = t?.name ?? 'Torneo';
    participants = participantIds
      .filter(pid => !hiddenIds.includes(pid))
      .map(pid => {
        const u = userMap.get(pid);
        return u ? { id: u.id, full_name: u.full_name, nickname: u.nickname } : null;
      })
      .filter(Boolean) as Array<{ id: string; full_name: string | null; nickname: string | null }>;
  }

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversationId,
      type: conv.type,
      tournament_id: conv.tournament_id,
      title,
      participants,
      tournament,
    },
  });
}

