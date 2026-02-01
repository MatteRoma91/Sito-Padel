import { getUsers, getCumulativeRankings, getTournamentsPast, getTournamentRankings, getPairs } from '@/lib/db/queries';
import { Trophy, Medal, Award } from 'lucide-react';

export default async function RankingsPage() {
  const allUsers = getUsers();
  // Exclude only the 'admin' user account from rankings display (not all admins)
  const users = allUsers.filter(u => u.username !== 'admin');
  const cumulativeRankings = getCumulativeRankings();
  const pastTournaments = getTournamentsPast().slice(0, 5);

  const userMap = new Map(users.map(u => [u.id, u]));

  // Create ranking list with user info (admin users excluded via userMap)
  const rankedUsers = cumulativeRankings
    .map(r => ({
      ...r,
      user: userMap.get(r.user_id),
    }))
    .filter(r => r.user)
    .sort((a, b) => b.total_points - a.total_points);

  // Get medals for display
  const getMedal = (position: number) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-slate-600" />;
    if (position === 3) return <Award className="w-5 h-5 text-[#B2FF00]" />;
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Classifiche</h1>

      {/* Cumulative ranking */}
      <div className="card">
        <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#B2FF00]" />
            Classifica Generale
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Punti totali accumulati in tutti i tornei
          </p>
        </div>

        <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
          {rankedUsers.length === 0 ? (
            <p className="p-4 text-slate-700 dark:text-slate-300">
              Nessuna classifica disponibile. Completa un torneo per vedere i risultati.
            </p>
          ) : (
            rankedUsers.map((r, i) => (
              <div 
                key={r.user_id} 
                className={`flex items-center justify-between p-4 ${
                  i < 3 ? 'bg-gradient-to-r from-transparent to-[#e8eeff] dark:to-[#0c1451]/20' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold
                    ${i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      i === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                      i === 2 ? 'bg-accent-100 text-[#629900]' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-500'}
                  `}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {r.user?.nickname || r.user?.full_name || r.user?.username}
                      </span>
                      {getMedal(i + 1)}
                    </div>
                    {/* Medals display */}
                    {(r.gold_medals > 0 || r.silver_medals > 0 || r.bronze_medals > 0 || r.wooden_spoons > 0) && (
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        {r.gold_medals > 0 && (
                          <span title="Ori">🥇{r.gold_medals}</span>
                        )}
                        {r.silver_medals > 0 && (
                          <span title="Argenti">🥈{r.silver_medals}</span>
                        )}
                        {r.bronze_medals > 0 && (
                          <span title="Bronzi">🥉{r.bronze_medals}</span>
                        )}
                        {r.wooden_spoons > 0 && (
                          <span title="Cucchiarelle">🥄{r.wooden_spoons}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[#B2FF00]">{r.total_points}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 ml-1">pt</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent tournament rankings */}
      {pastTournaments.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Classifiche Tornei Recenti
            </h2>
          </div>
          <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
            {pastTournaments.map(tournament => {
              const rankings = getTournamentRankings(tournament.id);
              const pairs = getPairs(tournament.id);
              const pairMap = new Map(pairs.map(p => [p.id, p]));

              if (rankings.length === 0) return null;

              return (
                <div key={tournament.id} className="p-4">
                  <h3 className="font-medium text-slate-800 dark:text-slate-100 mb-2">
                    {tournament.name}
                    <span className="text-sm text-slate-700 dark:text-slate-300 ml-2">
                      ({new Date(tournament.date).toLocaleDateString('it-IT')})
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {rankings.slice(0, 4).map((r, i) => {
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
                              i === 2 ? 'text-[#B2FF00]' : 
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
