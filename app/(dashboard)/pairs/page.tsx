import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentsFuture, getTournamentParticipants, getUsers, getCumulativeRankings, getPairs } from '@/lib/db/queries';
import { canSeeHiddenUsers } from '@/lib/visibility';
import { Shuffle, AlertCircle } from 'lucide-react';
import { PairsExtractor } from '@/components/pairs/PairsExtractor';
import { PairsDisplay } from '@/components/pairs/PairsDisplay';

export default async function PairsPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const canSeeHidden = canSeeHiddenUsers(currentUser);

  const tournaments = getTournamentsFuture();
  const selectedTournamentId = params.tournament || tournaments[0]?.id;
  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);

  let participants: { user_id: string }[] = [];
  let existingPairs: { id: string; player1_id: string; player2_id: string; seed: number }[] = [];

  if (selectedTournament) {
    const allParticipants = getTournamentParticipants(selectedTournament.id);
    participants = allParticipants.filter(p => p.participating).map(p => ({ user_id: p.user_id }));
    existingPairs = getPairs(selectedTournament.id);
  }

  const allUsers = getUsers();
  const rankings = getCumulativeRankings();

  const userMap = new Map(allUsers.map(u => [u.id, u]));
  const rankingMap = new Map(rankings.map(r => [r.user_id, r.total_points]));
  
  // Filter hidden users for display purposes (non-admin viewers)
  const hiddenUserIds = new Set(allUsers.filter(u => u.is_hidden && !canSeeHidden).map(u => u.id));
  const visibleParticipants = canSeeHidden 
    ? participants 
    : participants.filter(p => !hiddenUserIds.has(p.user_id));
  const visiblePairs = canSeeHidden
    ? existingPairs
    : existingPairs.filter(p => !hiddenUserIds.has(p.player1_id) && !hiddenUserIds.has(p.player2_id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Estrazione Coppie</h1>
      </div>

      {/* Tournament selector */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Seleziona Torneo
        </label>
        {tournaments.length === 0 ? (
          <p className="text-slate-700 dark:text-slate-300">
            Nessun torneo futuro disponibile.{' '}
            {isAdmin && <Link href="/tournaments/new" className="text-accent-500 hover:underline">Crea un torneo</Link>}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tournaments.map(t => (
              <Link
                key={t.id}
                href={`/pairs?tournament=${t.id}`}
                className={`px-4 py-2 rounded-lg border transition ${
                  t.id === selectedTournamentId
                    ? 'bg-accent-500 text-slate-900 border-accent-500'
                    : 'bg-white dark:bg-white/90 border-primary-100 hover:border-accent-500'
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {selectedTournament && (
        <>
          {/* Status */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">{selectedTournament.name}</h2>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {new Date(selectedTournament.date).toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-accent-500">{participants.length}/16</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">partecipanti</p>
              </div>
            </div>

            {participants.length < 16 && (
              <div className="mt-4 p-3 rounded-lg bg-accent-100 text-[#629900] flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Partecipanti insufficienti</p>
                  <p className="text-sm">
                    Servono esattamente 16 partecipanti per estrarre le coppie.{' '}
                    {isAdmin && (
                      <Link href={`/tournaments/${selectedTournament.id}`} className="underline">
                        Aggiungi partecipanti
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Extraction button (admin only) */}
          {isAdmin && participants.length === 16 && (
            <PairsExtractor
              tournamentId={selectedTournament.id}
              hasExistingPairs={existingPairs.length > 0}
            />
          )}

          {/* Display pairs */}
          {visiblePairs.length > 0 ? (
            <PairsDisplay
              pairs={visiblePairs}
              userMap={userMap}
              rankingMap={rankingMap}
            />
          ) : participants.length === 16 ? (
            <div className="card p-8 text-center">
              <Shuffle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-700 dark:text-slate-300">
                Le coppie non sono ancora state estratte.
                {isAdmin && ' Clicca il pulsante sopra per procedere.'}
              </p>
            </div>
          ) : null}

          {/* Participants ranking preview */}
          <div className="card">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Classifica Partecipanti
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Le coppie vengono formate accoppiando il più forte con il più debole
              </p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {visibleParticipants
                .map(p => ({
                  ...p,
                  user: userMap.get(p.user_id),
                  points: rankingMap.get(p.user_id) || 0,
                }))
                .sort((a, b) => b.points - a.points)
                .map((p, i) => (
                  <div key={p.user_id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                        ${i < 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}
                      `}>
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {p.user?.nickname || p.user?.full_name || p.user?.username}
                      </span>
                    </div>
                    <span className="text-accent-500 font-medium">{p.points} pt</span>
                  </div>
                ))}
              {visibleParticipants.length === 0 && (
                <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
                  Nessun partecipante
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
