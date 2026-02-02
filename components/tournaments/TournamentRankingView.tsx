import type { TournamentRanking, Pair, User } from '@/lib/types';
import { Trophy, Medal, Award } from 'lucide-react';

interface TournamentRankingViewProps {
  rankings: TournamentRanking[];
  pairs: Pair[];
  userMap: Map<string, User>;
}

export function TournamentRankingView({ rankings, pairs, userMap }: TournamentRankingViewProps) {
  const pairMap = new Map(pairs.map(p => [p.id, p]));

  const sortedRankings = [...rankings].sort((a, b) => a.position - b.position);

  const getMedal = (position: number) => {
    if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (position === 2) return <Medal className="w-5 h-5 text-slate-600" />;
    if (position === 3) return <Award className="w-5 h-5 text-accent-500" />;
    return null;
  };

  const getPositionStyle = (position: number) => {
    if (position === 1) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (position === 2) return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    if (position === 3) return 'bg-accent-100 text-[#629900]';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent-500" />
          Classifica Torneo
        </h3>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {sortedRankings.map(r => {
          const pair = pairMap.get(r.pair_id);
          const p1 = pair ? userMap.get(pair.player1_id) : null;
          const p2 = pair ? userMap.get(pair.player2_id) : null;
          const name1 = p1?.nickname || p1?.full_name || '?';
          const name2 = p2?.nickname || p2?.full_name || '?';

          return (
            <div 
              key={r.pair_id} 
              className={`flex items-center justify-between p-4 ${
                r.position <= 3 ? 'bg-gradient-to-r from-transparent to-[#e8eeff] dark:to-[#0c1451]/20' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getPositionStyle(r.position)}`}>
                  {r.position}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {name1} / {name2}
                  </span>
                  {getMedal(r.position)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-accent-500">{r.points}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 ml-1">pt</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
