import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getTournamentById,
  getMvpVotingStatus,
  getMvpVoteCounts,
  getMvpDeadline,
  getTournamentMvp,
  getUserById,
  getUsersByIds,
  setMvpDeadline,
  closeMvpVoting,
  reopenMvpVoting,
  getTournamentParticipantUserIds,
} from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { id: tournamentId } = await params;
  const tournament = getTournamentById(tournamentId);
  if (!tournament || tournament.status !== 'completed' || !tournament.completed_at) {
    return NextResponse.json({ error: 'Torneo non valido per MVP' }, { status: 404 });
  }

  const status = getMvpVotingStatus(tournamentId, user.id);
  const voteCounts = getMvpVoteCounts(tournamentId);
  const deadline = getMvpDeadline(tournament);

  const maxVotes = voteCounts.length > 0 ? voteCounts[0].voteCount : 0;
  const tied = voteCounts.filter(c => c.voteCount === maxVotes && maxVotes > 0);
  const mvpUserId = getTournamentMvp(tournamentId);
  const mvpUser = mvpUserId ? getUserById(mvpUserId) : null;
  const mvpAssigned = mvpUser ? (mvpUser.nickname || mvpUser.full_name || mvpUser.username) : null;
  const needsAdminAssignment = status.needsAdminAssignment ?? false;
  const participantIds = getTournamentParticipantUserIds(tournamentId);
  const participantUsers = getUsersByIds(participantIds);
  const participants = participantUsers.map(u => ({
    userId: u.id,
    name: u.nickname || u.full_name || u.username || u.id,
  }));

  return NextResponse.json({
    status,
    voteCounts,
    deadline: deadline?.toISOString() ?? null,
    tied,
    mvpAssigned,
    needsAdminAssignment,
    participants,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { id: tournamentId } = await params;
  const tournament = getTournamentById(tournamentId);
  if (!tournament || tournament.status !== 'completed' || !tournament.completed_at) {
    return NextResponse.json({ error: 'Torneo non valido per MVP' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action, mvpUserId, mvpDeadline } = body;

    if (action === 'set_deadline') {
      if (typeof mvpDeadline !== 'string') {
        return NextResponse.json({ error: 'mvpDeadline richiesto (ISO string)' }, { status: 400 });
      }
      const d = new Date(mvpDeadline);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data non valida' }, { status: 400 });
      }
      setMvpDeadline(tournamentId, d.toISOString());
      return NextResponse.json({ success: true });
    }

    if (action === 'close') {
      if (mvpUserId && typeof mvpUserId === 'string') {
        const participantIds = getTournamentParticipantUserIds(tournamentId);
        if (!participantIds.includes(mvpUserId.trim())) {
          return NextResponse.json({ error: 'Utente non partecipante' }, { status: 400 });
        }
        closeMvpVoting(tournamentId, mvpUserId.trim());
        return NextResponse.json({ success: true });
      }
      // Chiude solo la finestra di votazione; l'admin deve assegnare/confermare tramite la sezione Assegna MVP
      setMvpDeadline(tournamentId, new Date().toISOString());
      return NextResponse.json({ success: true });
    }

    if (action === 'assign') {
      if (!mvpUserId || typeof mvpUserId !== 'string') {
        return NextResponse.json({ error: 'mvpUserId richiesto' }, { status: 400 });
      }
      const participantIds = getTournamentParticipantUserIds(tournamentId);
      if (!participantIds.includes(mvpUserId.trim())) {
        return NextResponse.json({ error: 'Utente non partecipante' }, { status: 400 });
      }
      closeMvpVoting(tournamentId, mvpUserId.trim());
      return NextResponse.json({ success: true });
    }

    if (action === 'assign_none') {
      closeMvpVoting(tournamentId, null);
      return NextResponse.json({ success: true });
    }

    if (action === 'reopen') {
      reopenMvpVoting(tournamentId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }
}
