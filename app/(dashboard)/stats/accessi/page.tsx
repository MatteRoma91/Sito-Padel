import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUsersWithLoginCounts } from '@/lib/db/queries';
import { Activity } from 'lucide-react';

export default async function AccessiPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const canAccess =
    user.username === 'admin' || user.username.toLowerCase() === 'gazzella';
  if (!canAccess) redirect('/');

  const users = getUsersWithLoginCounts();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Activity className="w-7 h-7 text-[#B2FF00]" />
        Statistiche accessi
      </h1>
      <p className="text-slate-700 dark:text-slate-300">
        Numero di volte che ogni giocatore ha effettuato il login nel sito.
      </p>

      <div className="card">
        <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Accessi per giocatore</h2>
        </div>
        <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
          {users.length === 0 ? (
            <p className="p-4 text-slate-700 dark:text-slate-300">Nessun dato disponibile.</p>
          ) : (
            users.map((u) => (
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
                <span className="font-bold text-[#B2FF00] text-lg">
                  {u.login_count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
