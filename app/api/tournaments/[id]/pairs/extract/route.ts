import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getTournamentParticipants, 
  getCumulativeRankings,
  getUsersByIds,
  deletePairs,
  deleteMatches,
  deleteTournamentRankings,
  insertPairs
} from '@/lib/db/queries';
import { extractPairs } from '@/lib/pairs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tournamentId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    // Get participating users
    const participants = getTournamentParticipants(tournamentId);
    const participatingIds = participants.filter(p => p.participating).map(p => p.user_id);

    if (participatingIds.length !== 16) {
      return NextResponse.json({ 
        success: false, 
        error: `Servono esattamente 16 partecipanti, trovati ${participatingIds.length}` 
      }, { status: 400 });
    }

    // Get rankings
    const rankings = getCumulativeRankings();
    const rankingMap = new Map(rankings.map(r => [r.user_id, r.total_points]));

    const users = getUsersByIds(participatingIds);
    const skillLevelMap = new Map(users.map(u => [u.id, u.skill_level]));
    const overallScoreMap = new Map(users.map(u => [u.id, u.overall_score ?? 50]));

    const extractedPairs = extractPairs(participatingIds, rankingMap, skillLevelMap, overallScoreMap);

    // Delete existing pairs, matches, and rankings
    deleteMatches(tournamentId);
    deleteTournamentRankings(tournamentId);
    deletePairs(tournamentId);

    // Insert new pairs
    insertPairs(tournamentId, extractedPairs);

    return NextResponse.json({ success: true, pairs: extractedPairs });
  } catch (error) {
    console.error('Extract pairs error:', error);
    const message = error instanceof Error ? error.message : 'Errore del server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
