'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CarnetSchedaPlayer } from '@/components/lezioni/CarnetSchedaPlayer';

type EntRow = {
  id: string;
  kind: string;
  lessons_used: number;
  lessons_total: number;
  primary_name: string | null;
};

type ReqRow = {
  id: string;
  preferred_start: string;
  status: string;
};

/** Carnet, richiesta lezione e annullo — solo dati del giocatore (API già filtrate). */
export function LezioniPlayerClient() {
  const [entitlements, setEntitlements] = useState<EntRow[]>([]);
  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [entId, setEntId] = useState('');
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [eRes, rRes] = await Promise.all([
          fetch('/api/lesson-entitlements'),
          fetch('/api/lesson-requests'),
        ]);
        if (eRes.ok) {
          const j = await eRes.json();
          setEntitlements(j.entitlements || []);
        }
        if (rRes.ok) {
          const j = await rRes.json();
          setRequests(j.requests || []);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!entId || !when) return;
    setMsg(null);
    const res = await fetch('/api/lesson-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entitlementId: entId,
        preferredStart: new Date(when).toISOString(),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setMsg('Richiesta inviata.');
      const rRes = await fetch('/api/lesson-requests');
      if (rRes.ok) {
        const j = await rRes.json();
        setRequests(j.requests || []);
      }
    } else {
      setMsg(data.error || 'Errore');
    }
  }

  async function cancelRequest(id: string) {
    const res = await fetch(`/api/lesson-requests/${id}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setRequests((r) => r.filter((x) => x.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">I tuoi carnet</h2>
        {entitlements.length > 0 ? (
          <div className="space-y-6">
            {entitlements.map((e) => (
              <CarnetSchedaPlayer
                key={e.id}
                entitlement={{
                  id: e.id,
                  kind: e.kind,
                  lessons_total: e.lessons_total,
                  primary_name: e.primary_name,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nessun carnet.</p>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Richiedi una lezione</h2>
        <form onSubmit={submitRequest} className="space-y-2">
          <div className="flex flex-wrap gap-2 items-end">
            <select
              value={entId}
              onChange={(e) => setEntId(e.target.value)}
              className="input flex-1 min-w-[200px]"
              required
            >
              <option value="">— Carnet —</option>
              {entitlements
                .filter((e) => e.lessons_used < e.lessons_total)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.kind} · {e.primary_name}
                  </option>
                ))}
            </select>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="input"
              required
            />
            <button type="submit" className="btn-primary">
              Invia richiesta
            </button>
          </div>
          {msg && <p className="text-sm text-slate-600 dark:text-slate-400">{msg}</p>}
        </form>
      </Card>

      {requests.filter((r) => r.status === 'pending').length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Le tue richieste in attesa</h2>
          <ul className="space-y-2 text-sm">
            {requests
              .filter((r) => r.status === 'pending')
              .map((r) => (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 items-center">
                  <span>{new Date(r.preferred_start).toLocaleString('it-IT')}</span>
                  <button
                    type="button"
                    className="text-red-600 dark:text-red-400 text-sm"
                    onClick={() => cancelRequest(r.id)}
                  >
                    Annulla
                  </button>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
