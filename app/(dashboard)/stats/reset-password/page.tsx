import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/db/queries';
import { KeyRound } from 'lucide-react';
import { ResetPasswordClient } from './ResetPasswordClient';

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const canAccess = user.role === 'admin';
  if (!canAccess) redirect('/');

  const allUsers = getUsers();
  const users = allUsers.map(({ id, username, full_name, nickname }) => ({
    id,
    username,
    full_name,
    nickname,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <KeyRound className="w-7 h-7 text-[#B2FF00]" />
        Reset password
      </h1>
      <p className="text-slate-700 dark:text-slate-300">
        Resetta la password di un utente in caso di smarrimento o dimenticanza. La nuova password sarà <strong>abc123</strong> e dovrà essere cambiata al primo accesso.
      </p>

      <div className="card">
        <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Utenti</h2>
        </div>
        <div className="divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
          {users.length === 0 ? (
            <p className="p-4 text-slate-700 dark:text-slate-300">Nessun utente disponibile.</p>
          ) : (
            <ResetPasswordClient users={users} />
          )}
        </div>
      </div>
    </div>
  );
}
