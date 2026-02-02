import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { getUserById, getCumulativeRankings, getTournaments, getTournamentParticipantsByTournament, getMatchHistoryForUser, getPlayerStats, getOverallScoreHistory, getPointsHistory } from '@/lib/db/queries';
import { ROUND_LABELS } from '@/lib/bracket';
import { overallScoreToLevel, OVERALL_LEVEL_LABELS } from '@/lib/types';
import { ArrowLeft, Trophy, Calendar, Hand, LayoutGrid, Swords, BarChart3, Users } from 'lucide-react';
import { EditProfileForm } from '@/components/profiles/EditProfileForm';
import { DeleteUserButton } from '@/components/profiles/DeleteUserButton';
import { ProfileCharts } from '@/components/profiles/ProfileCharts';
import { Avatar } from '@/components/ui/Avatar';

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = getUserById(id);
  
  if (!user) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const isOwnProfile = currentUser?.id === user.id;

  // Get user stats
  const rankings = getCumulativeRankings();
  const userRanking = rankings.find(r => r.user_id === user.id);
  const userPosition = rankings.findIndex(r => r.user_id === user.id) + 1;

  // Get tournaments participated
  const allTournaments = getTournaments();
  const participations = getTournamentParticipantsByTournament(allTournaments.map(t => t.id));
  const userParticipations = participations.filter(p => p.user_id === user.id);
  const participatedTournaments = allTournaments.filter(t => 
    userParticipations.some(p => p.tournament_id === t.id)
  );

  const matchHistory = getMatchHistoryForUser(user.id);
  const playerStats = getPlayerStats(user.id);
  const overallHistory = getOverallScoreHistory(user.id);
  const pointsHistory = getPointsHistory(user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/profiles" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-[#B2FF00] dark:hover:text-[#c4ff33] transition">
        <ArrowLeft className="w-4 h-4" />
        Torna ai giocatori
      </Link>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <Avatar 
            src={user.avatar} 
            name={user.nickname || user.full_name || user.username} 
            size="xl" 
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {user.nickname || user.full_name || user.username}
            </h1>
            <p className="text-slate-700 dark:text-slate-300">@{user.username}</p>
            {user.birth_date && (() => {
              const m = user.birth_date.match(/^\d{4}-(\d{2})-(\d{2})$/);
              if (!m) return null;
              const d = new Date(2000, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
              const formatted = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
              return (
                <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">
                  Compleanno: {formatted}
                </p>
              );
            })()}
            {user.role === 'admin' && (
              <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-primary-100 dark:bg-[#0c1451]/30 text-[#202ca1] dark:text-[#6270F3]">
                Admin
              </span>
            )}
          </div>
          {(isAdmin || isOwnProfile) && (
            <div className="flex gap-2">
              {isAdmin && user.role !== 'admin' && (
                <DeleteUserButton userId={user.id} />
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-[#9AB0F8] dark:border-[#6270F3]/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#B2FF00]">{userRanking?.total_points || 0}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Punti Totali</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#B2FF00]">
              {userPosition > 0 ? `#${userPosition}` : '-'}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Classifica</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#B2FF00]">{participatedTournaments.length}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Tornei</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#B2FF00]">{user.overall_score ?? '-'}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Punteggio overall</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {user.overall_score != null ? OVERALL_LEVEL_LABELS[overallScoreToLevel(user.overall_score)] : '-'}
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Livello</p>
          </div>
        </div>

        <ProfileCharts overallHistory={overallHistory} pointsHistory={pointsHistory} />

        {/* Statistiche di gioco - solo se ha partite */}
        {matchHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#9AB0F8] dark:border-[#6270F3]/50">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#B2FF00]" />
              Statistiche di gioco
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-primary-50 dark:bg-[#0c1451]/20">
                <p className="text-xl font-bold text-[#B2FF00]">{playerStats.gamesWon}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">Game vinti</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary-50 dark:bg-[#0c1451]/20">
                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{playerStats.gamesLost}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">Game persi</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary-50 dark:bg-[#0c1451]/20">
                <p className="text-xl font-bold text-[#B2FF00]">{playerStats.winRate}%</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">Vittorie</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary-50 dark:bg-[#0c1451]/20">
                <p className="text-xl font-bold text-[#B2FF00]">{playerStats.gamesWinRate}%</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">Efficienza game</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-200">Partite:</span>
                <span>{playerStats.matchesWon} vinte, {playerStats.matchesLost} perse</span>
              </div>
              {(playerStats.currentWinStreak > 0 || playerStats.bestWinStreak > 0) && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-200">Streak:</span>
                  <span>attuale {playerStats.currentWinStreak}, migliore {playerStats.bestWinStreak}</span>
                </div>
              )}
              {playerStats.favoritePartner && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Coppia preferita:</span>
                  <Link href={`/profiles/${playerStats.favoritePartner.id}`} className="text-[#B2FF00] hover:underline">
                    {playerStats.favoritePartner.name}
                  </Link>
                  <span>({playerStats.favoritePartner.matchesTogether} partite)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medals section */}
        {userRanking && (userRanking.gold_medals > 0 || userRanking.silver_medals > 0 || userRanking.bronze_medals > 0 || userRanking.wooden_spoons > 0) && (
          <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-[#9AB0F8] dark:border-[#6270F3]/50">
            {userRanking.gold_medals > 0 && (
              <div className="flex items-center gap-1" title="Medaglie d'Oro">
                <span className="text-2xl">🥇</span>
                <span className="font-bold text-yellow-600">{userRanking.gold_medals}</span>
              </div>
            )}
            {userRanking.silver_medals > 0 && (
              <div className="flex items-center gap-1" title="Medaglie d'Argento">
                <span className="text-2xl">🥈</span>
                <span className="font-bold text-slate-600">{userRanking.silver_medals}</span>
              </div>
            )}
            {userRanking.bronze_medals > 0 && (
              <div className="flex items-center gap-1" title="Medaglie di Bronzo">
                <span className="text-2xl">🥉</span>
                <span className="font-bold text-amber-700">{userRanking.bronze_medals}</span>
              </div>
            )}
            {userRanking.wooden_spoons > 0 && (
              <div className="flex items-center gap-1" title="Cucchiarelle di Legno">
                <span className="text-2xl">🥄</span>
                <span className="font-bold text-amber-900">{userRanking.wooden_spoons}</span>
              </div>
            )}
          </div>
        )}

        {/* Player preferences */}
        {(user.preferred_side || user.preferred_hand) && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#9AB0F8] dark:border-[#6270F3]/50">
            {user.preferred_side && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm">Lato: <span className="font-medium text-slate-800 dark:text-slate-200">{user.preferred_side}</span></span>
              </div>
            )}
            {user.preferred_hand && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Hand className="w-4 h-4" />
                <span className="text-sm">Mano: <span className="font-medium text-slate-800 dark:text-slate-200">{user.preferred_hand}</span></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bio section */}
      {user.bio && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Bio</h2>
          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{user.bio}</p>
        </div>
      )}

      {/* Edit form (admin or own profile) */}
      {(isAdmin || isOwnProfile) && (
        <EditProfileForm 
          user={user} 
          isAdmin={isAdmin ?? false} 
          isOwnProfile={isOwnProfile ?? false}
        />
      )}

      {/* Tournaments */}
      <div className="card">
        <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#B2FF00]" />
            Tornei Partecipati
          </h2>
        </div>
        <div className="divide-y divide-[#e5ff99] dark:divide-[#6270F3]/50">
          {participatedTournaments.length === 0 ? (
            <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
              Nessun torneo partecipato
            </p>
          ) : (
            participatedTournaments.slice(0, 10).map(t => (
              <Link 
                key={t.id} 
                href={`/tournaments/${t.id}`}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(t.date).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <Trophy className="w-5 h-5 text-slate-600" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Match history */}
      <div className="card">
        <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#B2FF00]" />
            Storico Partite
          </h2>
        </div>
        <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
          {matchHistory.length === 0 ? (
            <p className="p-4 text-slate-700 dark:text-slate-300 text-sm">
              Nessuna partita disputata
            </p>
          ) : (
            matchHistory.map((m) => (
              <Link
                key={m.matchId}
                href={`/tournaments/${m.tournamentId}/bracket`}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {m.tournamentName}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {new Date(m.date).toLocaleDateString('it-IT')} · {ROUND_LABELS[m.round as keyof typeof ROUND_LABELS] || m.round}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 truncate">
                    vs {m.opponentPairNames}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {m.scoreUs} - {m.scoreThem}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      m.isWin
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {m.isWin ? 'Vittoria' : 'Sconfitta'}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
