'use client';

import { useState } from 'react';
import { Trophy, Medal, Award, BarChart2 } from 'lucide-react';

export interface GeneralRankingEntry {
  user_id: string;
  total_points: number;
  userName: string;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  wooden_spoons: number;
}

export interface LevelRankingEntry {
  id: string;
  userName: string;
  overall_score: number | null;
  levelLabel: string;
}

interface UnifiedRankingsCardProps {
  generalRanking: GeneralRankingEntry[];
  levelRanking: LevelRankingEntry[];
}

function getMedal(position: number) {
  if (position === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (position === 2) return <Medal className="w-5 h-5 text-slate-600" />;
  if (position === 3) return <Award className="w-5 h-5 text-accent-500" />;
  return null;
}

function positionStyle(i: number) {
  if (i === 0) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  if (i === 1) return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  if (i === 2) return 'bg-accent-100 text-[#629900]';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-500';
}

export function UnifiedRankingsCard({ generalRanking, levelRanking }: UnifiedRankingsCardProps) {
  const [activeView, setActiveView] = useState<'generale' | 'livello'>('generale');

  return (
    <div className="card">
      <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveView('generale')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition ${
            activeView === 'generale'
              ? 'bg-accent-500/20 text-slate-800 dark:text-slate-100 border border-accent-500/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-5 h-5 text-accent-500" />
          Classifica Generale
        </button>
        <button
          type="button"
          onClick={() => setActiveView('livello')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition ${
            activeView === 'livello'
              ? 'bg-accent-500/20 text-slate-800 dark:text-slate-100 border border-accent-500/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-5 h-5 text-accent-500" />
          Classifica per livello
        </button>
      </div>

      <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
        {activeView === 'generale' && (
          <>
            {generalRanking.length === 0 ? (
              <p className="p-4 text-slate-700 dark:text-slate-300">
                Nessuna classifica disponibile. Completa un torneo per vedere i risultati.
              </p>
            ) : (
              generalRanking.map((r, i) => (
                <div
                  key={r.user_id}
                  className={`flex items-center justify-between p-4 ${
                    i < 3 ? 'bg-gradient-to-r from-transparent to-[#e8eeff] dark:to-[#0c1451]/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${positionStyle(i)}`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {r.userName}
                        </span>
                        {getMedal(i + 1)}
                      </div>
                      {(r.gold_medals > 0 || r.silver_medals > 0 || r.bronze_medals > 0 || r.wooden_spoons > 0) && (
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          {r.gold_medals > 0 && <span title="Ori">🥇{r.gold_medals}</span>}
                          {r.silver_medals > 0 && <span title="Argenti">🥈{r.silver_medals}</span>}
                          {r.bronze_medals > 0 && <span title="Bronzi">🥉{r.bronze_medals}</span>}
                          {r.wooden_spoons > 0 && <span title="Cucchiarelle">🥄{r.wooden_spoons}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-accent-500">{r.total_points}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 ml-1">pt</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeView === 'livello' && (
          <>
            {levelRanking.length === 0 ? (
              <p className="p-4 text-slate-700 dark:text-slate-300">Nessun giocatore.</p>
            ) : (
              levelRanking.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-4 ${
                    i < 3 ? 'bg-gradient-to-r from-transparent to-[#e8eeff] dark:to-[#0c1451]/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${positionStyle(i)}`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {r.userName}
                      </span>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{r.levelLabel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-accent-500">{r.overall_score ?? '-'}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 ml-1">/ 100</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
