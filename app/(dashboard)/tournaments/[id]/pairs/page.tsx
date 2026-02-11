import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { 
  getTournamentById, 
  getTournamentParticipants, 
  getUsers, 
  getPairs, 
  getMatches,
  getCumulativeRankings
} from '@/lib/db/queries';
import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react';
import { PairsManager } from '@/components/tournaments/PairsManager';

export default async function TournamentPairsPage({
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

  // Only admin can access this page
  if (!isAdmin) {
    redirect(`/tournaments/${id}`);
  }

  const participants = getTournamentParticipants(tournament.id);
  const allUsers = getUsers();
  const pairs = getPairs(tournament.id);
  const matches = getMatches(tournament.id);
  const cumulativeRankings = getCumulativeRankings();

  // If matches already exist, redirect to bracket page
  if (matches.length > 0) {
    redirect(`/tournaments/${id}/bracket`);
  }

  // Build maps
  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const rankingMap = new Map(cumulativeRankings.map(r => [r.user_id, r.total_points]));

  // Participating users
  const participatingUserIds = participants.filter(p => p.participating).map(p => p.user_id);

  const expectedPairs = tournament.max_players === 8 ? 4 : 8;
  const isComplete = pairs.length === expectedPairs;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link 
        href={`/tournaments/${tournament.id}`} 
        className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-accent-500 dark:hover:text-accent-400 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna al torneo
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <Shuffle className="w-6 h-6 text-accent-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Estrazione Coppie
          </h1>
        </div>
        <p className="text-slate-700 dark:text-slate-300">
          {tournament.name}
        </p>
      </div>

      {/* Pairs Manager */}
      <PairsManager
        tournamentId={tournament.id}
        maxPlayers={tournament.max_players}
        pairs={pairs}
        participatingUserIds={participatingUserIds}
        userMap={userMap}
        rankingMap={rankingMap}
        hasMatches={false}
      />

      {/* Proceed to bracket button */}
      {isComplete && (
        <div className="card p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Tutte le coppie sono pronte!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Procedi alla generazione del tabellone per iniziare il torneo.
              </p>
            </div>
            <Link
              href={`/tournaments/${tournament.id}/bracket`}
              className="btn btn-primary flex items-center gap-2"
            >
              Procedi al Tabellone
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
