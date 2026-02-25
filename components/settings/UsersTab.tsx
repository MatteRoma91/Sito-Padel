'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Trash2, Edit2, Eye, EyeOff, X } from 'lucide-react';

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
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [resetModalPassword, setResetModalPassword] = useState('');

  async function handleResetPassword(userId: string, password: string) {
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setResetModalUserId(null);
        setResetModalPassword('');
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
  const resetUser = resetModalUserId ? users.find((u) => u.id === resetModalUserId) : null;

  return (
    <>
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
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-primary-50 dark:hover:bg-primary-800/30 transition ${u.is_hidden ? 'opacity-60' : ''}`}
            >
              <div className="min-w-0 flex-1">
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
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleHidden(u.id, u.is_hidden)}
                  disabled={!!loadingId}
                  className={`min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 disabled:opacity-50 ${
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
                  className="min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 text-slate-600 dark:text-slate-400"
                  title="Modifica profilo"
                >
                  <Edit2 className="w-5 h-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUserId(u.id);
                    setResetModalPassword('');
                    setError(null);
                  }}
                  disabled={!!loadingId}
                  className="min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 text-slate-600 dark:text-slate-400 disabled:opacity-50"
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
                    className="min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50"
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

    {resetModalUserId && resetUser && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => !loadingId && setResetModalUserId(null)}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Reset password</h3>
            <button
              type="button"
              onClick={() => !loadingId && setResetModalUserId(null)}
              className="min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-50"
              disabled={!!loadingId}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleResetPassword(resetModalUserId, resetModalPassword);
            }}
          >
            {error && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nuova password per <strong>{resetUser.nickname || resetUser.full_name || resetUser.username}</strong> (lascia vuoto per abc123):
            </p>
            <input
              type="password"
              value={resetModalPassword}
              onChange={(e) => setResetModalPassword(e.target.value)}
              className="input w-full"
              placeholder="Lascia vuoto per abc123"
              autoComplete="new-password"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !loadingId && setResetModalUserId(null)}
                className="btn btn-secondary"
                disabled={!!loadingId}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!!loadingId}
              >
                {loadingId === resetModalUserId ? 'Salvataggio...' : 'Conferma'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
