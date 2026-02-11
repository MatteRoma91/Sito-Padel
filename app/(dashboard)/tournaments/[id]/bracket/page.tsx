import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { 
  getTournamentById, 
  getUsers, 
  getPairs, 
  getMatches,
  getTournamentRankings
} from '@/lib/db/queries';
import { canSeeHiddenUsers } from '@/lib/visibility';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { BracketView } from '@/components/bracket/BracketView';
import { TournamentRankingView } from '@/components/tournaments/TournamentRankingView';
import { ExportPdfButton } from '@/components/tournaments/ExportPdfButton';
import { GenerateBracketButton } from '@/components/tournaments/GenerateBracketButton';
import { ConsolidateResultsButton } from '@/components/tournaments/ConsolidateResultsButton';
import { ReopenTournamentButton } from '@/components/tournaments/ReopenTournamentButton';
import { isTournamentComplete } from '@/lib/rankings';

export default async function TournamentBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = getTournamentById(id);
  
  if (!tournament) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const canSeeHidden = canSeeHiddenUsers(currentUser);

  const allUsers = getUsers();
  const pairs = getPairs(tournament.id);
  const matches = getMatches(tournament.id);
  const rankings = getTournamentRankings(tournament.id);

  const expectedPairs = tournament.max_players === 8 ? 4 : 8;

  // If no pairs, redirect to pairs page (admin) or tournament page (player)
  if (pairs.length < expectedPairs) {
    redirect(isAdmin ? `/tournaments/${id}/pairs` : `/tournaments/${id}`);
  }

  // Build user map
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  
  // Identify hidden user IDs for display filtering
  const hiddenUserIds = canSeeHidden 
    ? [] 
    : allUsers.filter(u => u.is_hidden).map(u => u.id);
  
  // Filter rankings for display
  const visibleRankings = rankings.filter(r => {
    if (canSeeHidden) return true;
    const pair = pairs.find(p => p.id === r.pair_id);
    if (!pair) return false;
    return !hiddenUserIds.includes(pair.player1_id) && !hiddenUserIds.includes(pair.player2_id);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href={`/tournaments/${tournament.id}`} 
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-accent-500 dark:hover:text-accent-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna al torneo
        </Link>
        
        {(pairs.length > 0 || matches.length > 0 || rankings.length > 0) && (
          <ExportPdfButton
            tournament={tournament}
            pairs={pairs}
            matches={matches}
            rankings={rankings}
            userMap={userMap}
          />
        )}
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <Grid3X3 className="w-6 h-6 text-accent-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Tabellone
          </h1>
        </div>
        <p className="text-slate-700 dark:text-slate-300">
          {tournament.name}
        </p>
      </div>

      {/* Generate bracket if no matches yet */}
      {matches.length === 0 && pairs.length === expectedPairs && isAdmin && (
        <GenerateBracketButton tournamentId={tournament.id} />
      )}

      {/* Reopen tournament button (admin only, completed tournaments) */}
      {isAdmin && tournament.status === 'completed' && (
        <ReopenTournamentButton tournamentId={tournament.id} />
      )}

      {/* Consolidate results button (admin only, when all matches have results but not yet completed) */}
      {isAdmin && tournament.status !== 'completed' && matches.length > 0 && isTournamentComplete(matches) && (
        <ConsolidateResultsButton tournamentId={tournament.id} />
      )}

      {/* Bracket view */}
      {matches.length > 0 && (
        <BracketView
          tournamentId={tournament.id}
          maxPlayers={tournament.max_players}
          pairs={pairs}
          matches={matches}
          userMap={userMap}
          isAdmin={isAdmin ?? false}
          tournamentStatus={tournament.status}
          hiddenUserIds={hiddenUserIds}
        />
      )}

      {/* Rankings */}
      {visibleRankings.length > 0 && (
        <TournamentRankingView
          rankings={visibleRankings}
          pairs={pairs}
          userMap={userMap}
        />
      )}
    </div>
  );
}
