'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Eye, Users, Trophy, LogIn } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AnalyticsData {
  pageViews: { path: string; count: number }[];
  totalViews: number;
  usersCount: number;
  tournamentsCount: number;
  completedTournamentsCount: number;
  loginCountsTop: { username: string; full_name: string | null; nickname: string | null; login_count: number }[];
}

export function StatisticheTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  function formatNum(n: number): string {
    return n.toLocaleString('it-IT');
  }

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-8 bg-primary-200 dark:bg-primary-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-primary-100 dark:bg-primary-800 rounded" />
          <div className="h-20 bg-primary-100 dark:bg-primary-800 rounded" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-slate-700 dark:text-slate-300">Impossibile caricare le statistiche.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-secondary mt-4"
        >
          Riprova
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Panoramica</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
          <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/30">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Eye className="w-4 h-4" />
              Visualizzazioni totali
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNum(data.totalViews)}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/30">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Users className="w-4 h-4" />
              Utenti
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNum(data.usersCount)}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/30">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Trophy className="w-4 h-4" />
              Tornei totali
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNum(data.tournamentsCount)}</p>
          </div>
          <div className="p-4 rounded-lg bg-primary-50 dark:bg-primary-900/30">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Trophy className="w-4 h-4" />
              Tornei completati
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNum(data.completedTournamentsCount)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <Eye className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Visualizzazioni per pagina</h2>
        </div>
        <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
          Conteggio delle visite per percorso (top 20).
        </p>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
          {data.pageViews.length === 0 ? (
            <p className="p-4 text-slate-700 dark:text-slate-300">Nessuna visualizzazione registrata.</p>
          ) : (
            data.pageViews.slice(0, 20).map((pv) => (
              <div
                key={pv.path}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-surface-primary/50 transition"
              >
                <code className="text-sm text-slate-700 dark:text-slate-300">{pv.path || '/'}</code>
                <span className="font-bold text-accent-500">{formatNum(pv.count)}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <LogIn className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Top 5 accessi (login)</h2>
        </div>
        <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
          Giocatori con il maggior numero di login.
        </p>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
          {!data.loginCountsTop?.length ? (
            <p className="p-4 text-slate-700 dark:text-slate-300">Nessun dato.</p>
          ) : (
            data.loginCountsTop.map((u) => (
              <div
                key={u.username}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-surface-primary/50 transition"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {u.nickname || u.full_name || u.username}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">@{u.username}</p>
                </div>
                <span className="font-bold text-accent-500">{formatNum(u.login_count)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
