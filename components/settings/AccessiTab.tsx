'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
  last_login_at: string | null;
}

interface BlockedAttempt {
  ip: string;
  username: string;
  failed_count: number;
  locked_until: string;
}

interface AccessiTabProps {
  usersWithLoginCounts: UserWithLoginCount[];
}

function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Mai';
  const d = new Date(iso);
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AccessiTab({ usersWithLoginCounts }: AccessiTabProps) {
  const [blockedAttempts, setBlockedAttempts] = useState<BlockedAttempt[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [blockedFetchError, setBlockedFetchError] = useState<string | null>(null);

  // Ordine già dalla query: last_login_at DESC (ultimo primo)
  const sortedUsers = usersWithLoginCounts;

  useEffect(() => {
    async function fetchBlocked() {
      try {
        const res = await fetch('/api/admin/blocked-ips', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          setBlockedAttempts(data.blocked || []);
          setBlockedFetchError(null);
        } else {
          setBlockedFetchError(
            res.status === 403
              ? 'Non autorizzato a vedere i blocchi.'
              : `Impossibile caricare l’elenco (HTTP ${res.status}).`,
          );
        }
      } catch {
        setBlockedFetchError('Errore di rete nel caricamento dei blocchi.');
      }
    }
    fetchBlocked();
  }, []);

  async function handleUnlock(ip: string, username: string) {
    const key = `${ip}-${username}`;
    setUnlocking(key);
    try {
      const res = await fetch('/api/admin/unlock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, username }),
      });
      if (res.ok) {
        setBlockedAttempts((prev) => prev.filter((b) => b.ip !== ip || b.username !== username));
      }
    } finally {
      setUnlocking(null);
    }
  }

  function formatLockedUntil(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Statistiche accessi</h2>
        </div>
        <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
          Ultimo accesso di ogni utente, ordinato dal più recente al più vecchio.
        </p>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
          {sortedUsers.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <Activity className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Nessun dato disponibile.</p>
            </div>
          ) : (
            sortedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-surface-primary/50 transition"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {u.nickname || u.full_name || u.username}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">@{u.username}</p>
                </div>
                <span className="text-accent-500 font-medium tabular-nums">{formatLastLogin(u.last_login_at)}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Account bloccati</h2>
        </div>
        <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
          Account bloccati per troppi tentativi di login errati (per IP + username). Puoi sbloccare anticipatamente. Lo stesso IP può accedere con un altro profilo.
        </p>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
          {blockedFetchError ? (
            <div className="p-8 flex flex-col items-center justify-center text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-10 h-10 mb-2 opacity-70" />
              <p className="text-sm text-center">{blockedFetchError}</p>
            </div>
          ) : blockedAttempts.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <ShieldAlert className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Nessun account bloccato.</p>
            </div>
          ) : (
            blockedAttempts.map((b) => {
              const key = `${b.ip}-${b.username}`;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-surface-primary/50 transition gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      @{b.username} · {b.ip}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {b.failed_count} tentativi · Sblocco: {formatLockedUntil(b.locked_until)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlock(b.ip, b.username)}
                    disabled={unlocking === key}
                    className="btn btn-primary shrink-0 flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    {unlocking === key ? 'Sblocco...' : 'Sblocca'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
