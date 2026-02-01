'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
}

export function ResetPasswordClient({ users }: { users: UserRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset(userId: string) {
    setLoadingId(userId);
    setError(null);
    setSuccessId(null);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSuccessId(userId);
      } else {
        setError(data.error || 'Errore durante il reset');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {users.map((u) => (
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
          <button
            onClick={() => handleReset(u.id)}
            disabled={!!loadingId}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <KeyRound className="w-4 h-4" />
            {loadingId === u.id
              ? 'Reset...'
              : successId === u.id
                ? 'Fatto!'
                : 'Reset password'}
          </button>
        </div>
      ))}
    </>
  );
}
