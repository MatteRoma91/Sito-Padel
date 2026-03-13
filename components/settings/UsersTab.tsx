'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, Trash2, Edit2, Eye, EyeOff, X, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';

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

type RoleFilter = 'tutti' | 'nascosti' | 'admin' | 'guest';

function matchesSearch(u: UserRow, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const name = (u.nickname || u.full_name || u.username || '').toLowerCase();
  const username = (u.username || '').toLowerCase();
  return name.includes(lower) || username.includes(lower);
}

function matchesRoleFilter(u: UserRow, filter: RoleFilter): boolean {
  if (filter === 'tutti') return true;
  if (filter === 'nascosti') return u.is_hidden === 1;
  if (filter === 'admin') return u.role === 'admin';
  if (filter === 'guest') return u.role === 'guest';
  return true;
}

export function UsersTab({ users }: UsersTabProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetModalUserId, setResetModalUserId] = useState<string | null>(null);
  const [resetModalPassword, setResetModalPassword] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('tutti');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

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
        setOpenMenuId(null);
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

  function handleDelete(userId: string, userName: string) {
    setUserToDelete({ id: userId, name: userName });
    setOpenMenuId(null);
  }

  async function confirmDelete() {
    const u = userToDelete;
    setUserToDelete(null);
    if (!u) return;
    setLoadingId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
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
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: !currentHidden }),
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

  const baseUsers = users.filter((u) => u.username !== 'admin');
  const filteredUsers = useMemo(
    () => baseUsers.filter((u) => matchesSearch(u, search) && matchesRoleFilter(u, roleFilter)),
    [baseUsers, search, roleFilter]
  );
  const resetUser = resetModalUserId ? users.find((u) => u.id === resetModalUserId) : null;

  return (
    <>
      <ConfirmDialog
        open={userToDelete !== null}
        title="Elimina utente"
        message={userToDelete ? `Eliminare l'utente "${userToDelete.name}"? Questa azione non può essere annullata.` : ''}
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
      <Card className="overflow-hidden">
        {error && (
          <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-sm" role="alert">
            {error}
          </div>
        )}
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 shrink-0">Gestione utenti</h3>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <input
              type="search"
              placeholder="Cerca nome o username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input max-w-xs min-w-[180px]"
              aria-label="Cerca utenti"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="input w-auto max-w-[140px]"
              aria-label="Filtra per ruolo"
            >
              <option value="tutti">Tutti</option>
              <option value="nascosti">Nascosti</option>
              <option value="admin">Admin</option>
              <option value="guest">Guest</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
          {filteredUsers.length === 0 ? (
            <p className="p-6 text-slate-700 dark:text-slate-300 text-center">Nessun utente trovato.</p>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 hover:bg-primary-50 dark:hover:bg-primary-800/30 transition ${u.is_hidden ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    src={null}
                    name={u.nickname || u.full_name || u.username}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {u.nickname || u.full_name || u.username}
                      {u.is_hidden ? (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          Nascosto
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      @{u.username}
                      {u.role === 'admin' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                          Admin
                        </span>
                      )}
                      {u.role === 'guest' && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Guest
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="hidden sm:flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleHidden(u.id, u.is_hidden)}
                      disabled={!!loadingId}
                      className={`min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 disabled:opacity-50 ${
                        u.is_hidden ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'
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
                  <div className="relative sm:hidden">
                    <button
                      type="button"
                      onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                      className="min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-primary-100 dark:hover:bg-primary-800/50 text-slate-600 dark:text-slate-400"
                      aria-expanded={openMenuId === u.id}
                      aria-haspopup="true"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openMenuId === u.id && (
                      <>
                        <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 py-1 rounded-lg border border-primary-200 dark:border-primary-600 bg-white dark:bg-slate-900 shadow-lg min-w-[180px]">
                          <button
                            type="button"
                            onClick={() => { handleToggleHidden(u.id, u.is_hidden); setOpenMenuId(null); }}
                            disabled={!!loadingId}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-800/50 disabled:opacity-50"
                          >
                            {u.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {u.is_hidden ? 'Mostra' : 'Nascondi'}
                          </button>
                          <Link
                            href={`/profiles/${u.id}`}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-800/50"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Edit2 className="w-4 h-4" />
                            Profilo
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalUserId(u.id);
                              setResetModalPassword('');
                              setError(null);
                              setOpenMenuId(null);
                            }}
                            disabled={!!loadingId}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-800/50 disabled:opacity-50"
                          >
                            <KeyRound className="w-4 h-4" />
                            Reset password
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => { handleDelete(u.id, u.nickname || u.username); setOpenMenuId(null); }}
                              disabled={!!loadingId}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Elimina
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

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
                <button type="submit" className="btn btn-primary" disabled={!!loadingId}>
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
