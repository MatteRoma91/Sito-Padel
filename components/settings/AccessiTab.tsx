'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity, ShieldAlert, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
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

function formatCount(n: number): string {
  return n.toLocaleString('it-IT');
}

export function AccessiTab({ usersWithLoginCounts }: AccessiTabProps) {
  const [blockedAttempts, setBlockedAttempts] = useState<BlockedAttempt[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const sortedByLogins = useMemo(
    () => [...usersWithLoginCounts].sort((a, b) => (b.login_count ?? 0) - (a.login_count ?? 0)),
    [usersWithLoginCounts]
  );

  useEffect(() => {
    async function fetchBlocked() {
      try {
        const res = await fetch('/api/admin/blocked-ips');
        if (res.ok) {
          const data = await res.json();
          setBlockedAttempts(data.blocked || []);
        }
      } catch {
        // ignore
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
          Numero di volte che ogni giocatore ha effettuato il login nel sito.
        </p>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50">
          {sortedByLogins.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <Activity className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Nessun dato disponibile.</p>
            </div>
          ) : (
            sortedByLogins.map((u) => (
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
                <span className="font-bold text-accent-500 text-lg">{formatCount(u.login_count ?? 0)}</span>
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
          {blockedAttempts.length === 0 ? (
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
                  className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition gap-4"
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
