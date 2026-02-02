import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { 
  getTournamentById, 
  getTournamentParticipants, 
  getUsers, 
  getPairs, 
  getMatches,
  getTournamentRankings,
  getCumulativeRankings
} from '@/lib/db/queries';
import { canSeeHiddenUsers } from '@/lib/visibility';
import { TOURNAMENT_CATEGORY_LABELS } from '@/lib/types';
import { ArrowLeft, Calendar, Clock, MapPin, Edit, Users, Shuffle, Trophy, ArrowRight, Grid3X3 } from 'lucide-react';
import { ParticipantsManager } from '@/components/tournaments/ParticipantsManager';
import { TournamentStatusChanger } from '@/components/tournaments/TournamentStatusChanger';
import { TournamentRankingView } from '@/components/tournaments/TournamentRankingView';
import { ExportPdfButton } from '@/components/tournaments/ExportPdfButton';

export default async function TournamentDetailPage({
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

  const participants = getTournamentParticipants(tournament.id);
  const allUsers = getUsers();
  const pairs = getPairs(tournament.id);
  const matches = getMatches(tournament.id);
  const rankings = getTournamentRankings(tournament.id);
  const cumulativeRankings = getCumulativeRankings();

  // Build user map
  const userMap = new Map(allUsers.map(u => [u.id, u]));

  // Build ranking map for pairs display
  const rankingMap = new Map(cumulativeRankings.map(r => [r.user_id, r.total_points]));

  // Identify hidden user IDs for filtering display
  const hiddenUserIds = new Set(allUsers.filter(u => u.is_hidden && !canSeeHidden).map(u => u.id));

  // Filter pairs and rankings for display (non-admin viewers)
  const visiblePairs = pairs.filter(p => 
    canSeeHidden || (!hiddenUserIds.has(p.player1_id) && !hiddenUserIds.has(p.player2_id))
  );
  const visibleRankings = rankings.filter(r => {
    const pair = pairs.find(p => p.id === r.pair_id);
    if (!pair) return false;
    return canSeeHidden || (!hiddenUserIds.has(pair.player1_id) && !hiddenUserIds.has(pair.player2_id));
  });

  // Participating users
  const participatingUserIds = participants.filter(p => p.participating).map(p => p.user_id);

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Bozza', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    open: { label: 'Iscrizioni aperte', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    in_progress: { label: 'In corso', color: 'bg-primary-100 text-[#202ca1] dark:bg-[#0c1451]/30 dark:text-primary-300' },
    completed: { label: 'Completato', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  };

  const status = statusLabels[tournament.status] || statusLabels.draft;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/tournaments" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-accent-500 dark:hover:text-accent-400 transition">
        <ArrowLeft className="w-4 h-4" />
        Torna ai tornei
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {tournament.name}
              </h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
              {tournament.category && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  {TOURNAMENT_CATEGORY_LABELS[tournament.category]}
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(tournament.date).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {tournament.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {tournament.time}
                </span>
              )}
              {tournament.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {tournament.venue}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {(pairs.length > 0 || matches.length > 0 || rankings.length > 0) && (
              <ExportPdfButton
                tournament={tournament}
                pairs={pairs}
                matches={matches}
                rankings={rankings}
                userMap={userMap}
              />
            )}
            {isAdmin && (
              <Link href={`/tournaments/${tournament.id}/edit`} className="btn btn-secondary flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Modifica
              </Link>
            )}
          </div>
        </div>

        {/* Status changer for admin */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <TournamentStatusChanger tournamentId={tournament.id} currentStatus={tournament.status} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-accent-500 mb-1" />
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{participatingUserIds.length}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">Partecipanti</p>
        </div>
        <div className="card p-4 text-center">
          <Shuffle className="w-6 h-6 mx-auto text-accent-500 mb-1" />
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pairs.length}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">Coppie</p>
        </div>
        <div className="card p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto text-accent-500 mb-1" />
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {matches.filter(m => m.winner_pair_id).length}/{matches.length}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">Partite</p>
        </div>
      </div>

      {/* Participants (admin only, when not completed) */}
      {isAdmin && tournament.status !== 'completed' && (
        <ParticipantsManager
          tournamentId={tournament.id}
          participants={participants}
          allUsers={allUsers}
          userMap={userMap}
        />
      )}

      {/* Navigation: Go to pairs page when 16 participants and no pairs yet */}
      {isAdmin && participatingUserIds.length === 16 && pairs.length === 0 && tournament.status !== 'completed' && (
        <div className="card p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <Shuffle className="w-5 h-5" />
                Pronto per l&apos;estrazione!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Hai 16 partecipanti. Procedi con l&apos;estrazione o l&apos;assegnazione delle coppie.
              </p>
            </div>
            <Link
              href={`/tournaments/${tournament.id}/pairs`}
              className="btn btn-primary flex items-center gap-2"
            >
              Vai alle Coppie
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Navigation: Go to bracket page when 8 pairs */}
      {pairs.length === 8 && matches.length === 0 && (
        <div className="card p-6 bg-primary-50 border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#202ca1] flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                Coppie pronte!
              </p>
              <p className="text-sm text-[#9ee600] dark:text-[#c4ff33]">
                Le 8 coppie sono state formate. {isAdmin ? 'Procedi al tabellone.' : 'In attesa della generazione del tabellone.'}
              </p>
            </div>
            <Link
              href={`/tournaments/${tournament.id}/bracket`}
              className="btn btn-primary flex items-center gap-2"
            >
              {isAdmin ? 'Vai al Tabellone' : 'Visualizza Coppie'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Navigation: View bracket when matches exist */}
      {matches.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-accent-500" />
                Tabellone in corso
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {matches.filter(m => m.winner_pair_id).length} di {matches.length} partite completate
              </p>
            </div>
            <Link
              href={`/tournaments/${tournament.id}/bracket`}
              className="btn btn-primary flex items-center gap-2"
            >
              Visualizza Tabellone
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Pairs summary (visible when pairs exist but before matches) */}
      {visiblePairs.length > 0 && pairs.length < 8 && (
        <div className="card">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-accent-500" />
              Coppie ({visiblePairs.length}/8)
            </h3>
            {isAdmin && (
              <Link href={`/tournaments/${tournament.id}/pairs`} className="text-sm text-accent-500 hover:underline">
                Gestisci coppie
              </Link>
            )}
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {visiblePairs.map(pair => {
              const player1 = userMap.get(pair.player1_id);
              const player2 = userMap.get(pair.player2_id);
              const points1 = rankingMap.get(pair.player1_id) || 0;
              const points2 = rankingMap.get(pair.player2_id) || 0;
              return (
                <div key={pair.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-[#202ca1] dark:text-primary-300 text-sm font-medium">
                      {pair.seed}
                    </span>
                    <span className="text-slate-800 dark:text-slate-100">
                      {player1?.nickname || player1?.full_name || player1?.username} + {player2?.nickname || player2?.full_name || player2?.username}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {points1 + points2} pt
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rankings */}
      {visibleRankings.length > 0 && (
        <TournamentRankingView
          rankings={visibleRankings}
          pairs={visiblePairs}
          userMap={userMap}
        />
      )}
    </div>
  );
}
