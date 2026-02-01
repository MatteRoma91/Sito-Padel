import type { User } from '@/lib/types';

interface PairsDisplayProps {
  pairs: { id: string; player1_id: string; player2_id: string; seed: number }[];
  userMap: Map<string, User>;
  rankingMap: Map<string, number>;
}

export function PairsDisplay({ pairs, userMap, rankingMap }: PairsDisplayProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          Coppie Estratte ({pairs.length})
        </h3>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {pairs.map(pair => {
          const player1 = userMap.get(pair.player1_id);
          const player2 = userMap.get(pair.player2_id);
          const points1 = rankingMap.get(pair.player1_id) || 0;
          const points2 = rankingMap.get(pair.player2_id) || 0;
          const totalPoints = points1 + points2;

          return (
            <div key={pair.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-primary-100 text-[#202ca1] text-sm font-medium">
                  Coppia {pair.seed}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Tot: {totalPoints} pt
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-medium">
                    {(player1?.nickname || player1?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {player1?.nickname || player1?.full_name || player1?.username}
                    </p>
                    <p className="text-sm text-green-600">{points1} pt (forte)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#B2FF00] flex items-center justify-center text-slate-900 font-medium">
                    {(player2?.nickname || player2?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {player2?.nickname || player2?.full_name || player2?.username}
                    </p>
                    <p className="text-sm text-[#B2FF00]">{points2} pt</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
