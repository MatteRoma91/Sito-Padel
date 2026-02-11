import { getCurrentUser } from '@/lib/auth';
import { getUsers, getCumulativeRankings, getTournamentsPast, getTournamentRankings, getPairs } from '@/lib/db/queries';
import { getVisibleUsers, canSeeHiddenUsers } from '@/lib/visibility';
import { overallScoreToLevel, OVERALL_LEVEL_LABELS } from '@/lib/types';
import { UnifiedRankingsCard } from '@/components/rankings/UnifiedRankingsCard';

export const dynamic = 'force-dynamic';

export default async function RankingsPage() {
  const currentUser = await getCurrentUser();
  const canSeeHidden = canSeeHiddenUsers(currentUser);
  
  const allUsers = getUsers();
  // Exclude only the 'admin' user account from rankings display (not all admins)
  // Also filter hidden users based on viewer permissions
  const users = getVisibleUsers(allUsers.filter(u => u.username !== 'admin'), currentUser);
  const cumulativeRankings = getCumulativeRankings();
  const pastTournaments = getTournamentsPast().slice(0, 5);

  const userMap = new Map(users.map(u => [u.id, u]));
  // For tournament rankings, we need to know which users are hidden
  const hiddenUserIds = new Set(allUsers.filter(u => u.is_hidden && !canSeeHidden).map(u => u.id));

  // Create ranking list with user info (admin users excluded via userMap)
  const rankedUsers = cumulativeRankings
    .map(r => ({
      ...r,
      user: userMap.get(r.user_id),
    }))
    .filter(r => r.user)
    .sort((a, b) => b.total_points - a.total_points);

  // Classifica per livello (overall_score 0-100)
  const levelRankedUsers = [...users]
    .filter(u => u.username !== 'admin')
    .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0));

  const generalRanking = rankedUsers.map(r => ({
    user_id: r.user_id,
    total_points: r.total_points,
    userName: r.user?.nickname || r.user?.full_name || r.user?.username || '?',
    gold_medals: r.gold_medals,
    silver_medals: r.silver_medals,
    bronze_medals: r.bronze_medals,
    wooden_spoons: r.wooden_spoons,
    mvp_count: r.mvp_count ?? 0,
  }));

  const levelRanking = levelRankedUsers.map(u => ({
    id: u.id,
    userName: u.nickname || u.full_name || u.username || '?',
    overall_score: u.overall_score,
    levelLabel: u.overall_score != null ? OVERALL_LEVEL_LABELS[overallScoreToLevel(u.overall_score)] : '-',
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Classifiche</h1>

      <UnifiedRankingsCard generalRanking={generalRanking} levelRanking={levelRanking} />

      {/* Recent tournament rankings */}
      {pastTournaments.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Classifiche Tornei Recenti
            </h2>
          </div>
          <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
            {pastTournaments.map(tournament => {
              const rankings = getTournamentRankings(tournament.id);
              const pairs = getPairs(tournament.id);
              const pairMap = new Map(pairs.map(p => [p.id, p]));

              // Filter out rankings where any player in the pair is hidden
              const visibleRankings = rankings.filter(r => {
                const pair = pairMap.get(r.pair_id);
                if (!pair) return false;
                return !hiddenUserIds.has(pair.player1_id) && !hiddenUserIds.has(pair.player2_id);
              });

              if (visibleRankings.length === 0) return null;

              return (
                <div key={tournament.id} className="p-4">
                  <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">
                    {tournament.name}
                    <span className="text-sm text-slate-700 dark:text-slate-300 ml-2">
                      ({new Date(tournament.date).toLocaleDateString('it-IT')})
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {visibleRankings.slice(0, 4).map((r, i) => {
                      const pair = pairMap.get(r.pair_id);
                      const p1 = pair ? userMap.get(pair.player1_id) : null;
                      const p2 = pair ? userMap.get(pair.player2_id) : null;
                      const name1 = p1?.nickname || p1?.full_name || '?';
                      const name2 = p2?.nickname || p2?.full_name || '?';

                      return (
                        <div 
                          key={r.pair_id} 
                          className="p-2 rounded-lg bg-accent-50 dark:bg-[#629900]/20"
                        >
                          <div className="flex items-center gap-1 text-sm">
                            <span className={`font-bold ${
                              i === 0 ? 'text-yellow-600' : 
                              i === 1 ? 'text-slate-600' : 
                              i === 2 ? 'text-accent-500' : 
                              'text-slate-600'
                            }`}>
                              {r.position}°
                            </span>
                            <span className="truncate text-slate-700 dark:text-slate-300">
                              {name1} / {name2}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                            {r.points} punti
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
