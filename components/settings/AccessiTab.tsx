'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Unlock } from 'lucide-react';

interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
}

interface BlockedIp {
  ip: string;
  failed_count: number;
  locked_until: string;
  attempted_username: string;
}

interface AccessiTabProps {
  usersWithLoginCounts: UserWithLoginCount[];
}

export function AccessiTab({ usersWithLoginCounts }: AccessiTabProps) {
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([]);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlocked() {
      try {
        const res = await fetch('/api/admin/blocked-ips');
        if (res.ok) {
          const data = await res.json();
          setBlockedIps(data.blocked || []);
        }
      } catch {
        // ignore
      }
    }
    fetchBlocked();
  }, []);

  async function handleUnlock(ip: string) {
    setUnlocking(ip);
    try {
      const res = await fetch('/api/admin/unlock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (res.ok) {
        setBlockedIps((prev) => prev.filter((b) => b.ip !== ip));
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

    <div className="card">
      <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-amber-500" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">IP bloccati</h2>
      </div>
      <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
        Indirizzi IP bloccati per troppi tentativi di login errati. Puoi sbloccare anticipatamente.
      </p>
      <div className="divide-y divide-primary-100 dark:border-primary-300/50">
        {blockedIps.length === 0 ? (
          <p className="p-4 text-slate-700 dark:text-slate-300">Nessun IP bloccato.</p>
        ) : (
          blockedIps.map((b) => (
            <div
              key={b.ip}
              className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 dark:text-slate-100">{b.ip}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {b.attempted_username ? `Username: @${b.attempted_username}` : '—'} · {b.failed_count} tentativi · Sblocco: {formatLockedUntil(b.locked_until)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleUnlock(b.ip)}
                disabled={unlocking === b.ip}
                className="btn btn-primary shrink-0 flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                {unlocking === b.ip ? 'Sblocco...' : 'Sblocca'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
    </div>
  );
}
