'use client';

import { Activity } from 'lucide-react';

interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
}

interface AccessiTabProps {
  usersWithLoginCounts: UserWithLoginCount[];
}

export function AccessiTab({ usersWithLoginCounts }: AccessiTabProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent-500" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Statistiche accessi</h2>
      </div>
      <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
        Numero di volte che ogni giocatore ha effettuato il login nel sito.
      </p>
      <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
        {usersWithLoginCounts.length === 0 ? (
          <p className="p-4 text-slate-700 dark:text-slate-300">Nessun dato disponibile.</p>
        ) : (
          usersWithLoginCounts.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition"
            >
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {u.nickname || u.full_name || u.username}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">@{u.username}</p>
              </div>
              <span className="font-bold text-accent-500 text-lg">{u.login_count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
