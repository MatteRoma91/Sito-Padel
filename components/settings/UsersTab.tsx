'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  role: string;
  is_hidden: number;
}

interface UsersTabProps {
  users: UserRow[];
}

export function UsersTab({ users }: UsersTabProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResetPassword(userId: string) {
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Eliminare l'utente "${userName}"? Questa azione non può essere annullata.`)) return;
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleHidden(userId: string, currentHidden: number) {
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: currentHidden ? 0 : 1 }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || 'Errore');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoadingId(null);
    }
  }

  const filteredUsers = users.filter((u) => u.username !== 'admin');

  return (
    <div className="card divide-y divide-primary-100 dark:divide-primary-300/50">
      {error && (
        <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-sm">
          {error}
        </div>
      )}
      <div className="p-4 border-b border-primary-100 dark:border-primary-300/50">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Gestione utenti</h3>
      </div>
      <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
        {filteredUsers.length === 0 ? (
          <p className="p-4 text-slate-700 dark:text-slate-300">Nessun utente.</p>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-primary-800/30 transition ${u.is_hidden ? 'opacity-60' : ''}`}
            >
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {u.nickname || u.full_name || u.username}
                  {u.is_hidden ? (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      Nascosto
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  @{u.username}
                  {u.role === 'admin' && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                      Admin
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleHidden(u.id, u.is_hidden)}
                  disabled={!!loadingId}
                  className={`p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 disabled:opacity-50 ${
                    u.is_hidden 
                      ? 'text-slate-400 dark:text-slate-500' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title={u.is_hidden ? 'Mostra giocatore' : 'Nascondi giocatore'}
                >
                  {u.is_hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <Link
                  href={`/profiles/${u.id}`}
                  className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 text-slate-600 dark:text-slate-400"
                  title="Modifica profilo"
                >
                  <Edit2 className="w-5 h-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => handleResetPassword(u.id)}
                  disabled={!!loadingId}
                  className="p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 text-slate-600 dark:text-slate-400 disabled:opacity-50"
                  title="Reset password"
                >
                  <KeyRound className="w-5 h-5" />
                  {loadingId === u.id && '...'}
                </button>
                {u.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id, u.nickname || u.username)}
                    disabled={!!loadingId}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50"
                    title="Elimina utente"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
