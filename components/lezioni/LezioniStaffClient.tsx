'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { LessonEntitlementRow } from '@/lib/lesson-queries';

type RequestRow = {
  id: string;
  entitlement_id: string;
  requester_user_id: string;
  preferred_start: string;
  status: string;
  requester_name: string | null;
  entitlement_kind: string;
};

type Court = { id: string; name: string };

type SafeUser = { id: string; username: string; full_name: string | null; nickname: string | null; role: string };

function displayName(u: { nickname?: string | null; full_name?: string | null; username?: string }) {
  return u.nickname || u.full_name || u.username || '';
}

function VirtualTicket({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex gap-1 flex-wrap" aria-label={`Lezioni usate ${used} su ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-8 h-10 rounded border-2 flex items-center justify-center text-xs font-bold ${
            i < used
              ? 'bg-slate-300 dark:bg-slate-600 border-slate-400 line-through text-slate-600 dark:text-slate-300'
              : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-500 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

const SLOT_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) break;
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

export function LezioniStaffClient({ isAdmin }: { isAdmin: boolean }) {
  const [entitlements, setEntitlements] = useState<LessonEntitlementRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<'private' | 'pair'>('private');
  const [primaryId, setPrimaryId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [approveId, setApproveId] = useState<string | null>(null);
  const [appCourt, setAppCourt] = useState('');
  const [appDate, setAppDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appSlot, setAppSlot] = useState('09:00');
  const [appMaestro, setAppMaestro] = useState('');

  const [directEnt, setDirectEnt] = useState('');
  const [dirCourt, setDirCourt] = useState('');
  const [dirDate, setDirDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dirSlot, setDirSlot] = useState('09:00');
  const [dirMaestro, setDirMaestro] = useState('');

  const [manualEnt, setManualEnt] = useState('');
  const [manualAt, setManualAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [manualReason, setManualReason] = useState('');
  const [manualMaestro, setManualMaestro] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [dirNotes, setDirNotes] = useState('');
  const [manualArgomento, setManualArgomento] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [entRes, reqRes, courtRes, userRes] = await Promise.all([
        fetch('/api/lesson-entitlements'),
        fetch('/api/lesson-requests?status=pending'),
        fetch('/api/sports-center/courts'),
        fetch('/api/users'),
      ]);
      if (!entRes.ok) throw new Error('Errore caricamento carnet');
      const entJson = await entRes.json();
      setEntitlements(entJson.entitlements || []);

      if (reqRes.ok) {
        const reqJson = await reqRes.json();
        setRequests(reqJson.requests || []);
      }
      if (courtRes.ok) {
        const cj = await courtRes.json();
        setCourts(cj.courts || []);
      }
      if (userRes.ok) {
        const uj = await userRes.json();
        setUsers((uj.users || []).map((u: SafeUser) => u));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maestros = users.filter((u) => u.role === 'maestro');
  const players = users.filter((u) => u.role === 'player' || u.role === 'maestro' || u.role === 'admin');

  async function handleCreateCarnet(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/lesson-entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          primaryUserId: primaryId,
          partnerUserId: kind === 'pair' ? partnerId : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Errore');
      setPrimaryId('');
      setPartnerId('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!approveId || !appCourt || !appDate || !appSlot || !appMaestro) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson-requests/${approveId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: appCourt,
          date: appDate,
          slotStart: appSlot,
          maestroUserId: appMaestro,
          notes: appNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Errore');
      setApproveId(null);
      setAppNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(id: string) {
    setSubmitting(true);
    try {
      await fetch(`/api/lesson-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDirect() {
    if (!directEnt || !dirCourt || !dirDate || !dirSlot || !dirMaestro) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/lesson-sessions/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entitlementId: directEnt,
          courtId: dirCourt,
          date: dirDate,
          slotStart: dirSlot,
          maestroUserId: dirMaestro,
          notes: dirNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Errore');
      setDirNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManual() {
    if (!manualEnt || !manualReason.trim()) return;
    const iso = new Date(manualAt).toISOString();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson-entitlements/${manualEnt}/consume-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumedAt: iso,
          manualReason: manualReason.trim(),
          maestroUserId: manualMaestro || null,
          notes: manualArgomento.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Errore');
      setManualReason('');
      setManualArgomento('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lesson-entitlements/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    if (!undoId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lesson-entitlements/${undoId}/undo-last`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setUndoId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Caricamento…</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 text-sm" role="alert">
          {error}
        </div>
      )}

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Nuovo carnet (5 lezioni)</h2>
        <form onSubmit={handleCreateCarnet} className="space-y-3 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm text-slate-600 dark:text-slate-400">Tipo</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'private' | 'pair')}
              className="input w-auto"
            >
              <option value="private">Privato</option>
              <option value="pair">Coppia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Alunno principale</label>
            <select
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              className="input w-full max-w-md"
              required
            >
              <option value="">— Seleziona —</option>
              {players.map((u) => (
                <option key={u.id} value={u.id}>
                  {displayName(u)} (@{u.username})
                </option>
              ))}
            </select>
          </div>
          {kind === 'pair' && (
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Partner</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="input w-full max-w-md"
                required
              >
                <option value="">— Seleziona —</option>
                {players
                  .filter((u) => u.id !== primaryId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {displayName(u)} (@{u.username})
                    </option>
                  ))}
              </select>
            </div>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-fit">
            Crea carnet
          </button>
        </form>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Richieste in attesa</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nessuna richiesta pending.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="text-sm">
                  <span className="font-medium">{r.requester_name || r.requester_user_id}</span>
                  {' · '}
                  <span className="text-slate-600 dark:text-slate-400">
                    {new Date(r.preferred_start).toLocaleString('it-IT')}
                  </span>
                  {' · '}
                  <span className="text-slate-500">{r.entitlement_kind}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => {
                      setApproveId(r.id);
                      setAppCourt(courts[0]?.id || '');
                      setAppMaestro(maestros[0]?.id || '');
                    }}
                  >
                    Approva
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-600 dark:text-red-400"
                    onClick={() => handleReject(r.id)}
                    disabled={submitting}
                  >
                    Rifiuta
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Lezione diretta (senza richiesta)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={directEnt}
            onChange={(e) => setDirectEnt(e.target.value)}
            className="input"
          >
            <option value="">— Carnet —</option>
            {entitlements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.kind} · {e.primary_name} ({e.lessons_used}/{e.lessons_total})
              </option>
            ))}
          </select>
          <select value={dirCourt} onChange={(e) => setDirCourt(e.target.value)} className="input">
            <option value="">— Campo —</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input type="date" value={dirDate} onChange={(e) => setDirDate(e.target.value)} className="input" />
          <select value={dirSlot} onChange={(e) => setDirSlot(e.target.value)} className="input">
            {SLOT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={dirMaestro} onChange={(e) => setDirMaestro(e.target.value)} className="input">
            <option value="">— Maestro —</option>
            {maestros.map((m) => (
              <option key={m.id} value={m.id}>
                {displayName(m)}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={handleDirect} disabled={submitting}>
            Prenota lezione
          </button>
          <label className="block text-sm text-slate-600 dark:text-slate-400 sm:col-span-2 lg:col-span-3">
            Argomento (opzionale, max 1000)
            <textarea
              value={dirNotes}
              onChange={(e) => setDirNotes(e.target.value)}
              className="input w-full mt-1 min-h-[64px]"
              maxLength={1000}
              rows={2}
            />
          </label>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Timbro manuale (fuori timetable)</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Motivo obbligatorio. Maestro facoltativo se non indicato.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={manualEnt} onChange={(e) => setManualEnt(e.target.value)} className="input">
            <option value="">— Carnet —</option>
            {entitlements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.kind} · {e.primary_name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={manualAt}
            onChange={(e) => setManualAt(e.target.value)}
            className="input"
          />
          <select
            value={manualMaestro}
            onChange={(e) => setManualMaestro(e.target.value)}
            className="input"
          >
            <option value="">— Maestro (opz.) —</option>
            {maestros.map((m) => (
              <option key={m.id} value={m.id}>
                {displayName(m)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            placeholder="Motivo"
            className="input sm:col-span-2"
          />
          <label className="block text-sm text-slate-600 dark:text-slate-400 sm:col-span-2">
            Argomento lezione (opzionale)
            <textarea
              value={manualArgomento}
              onChange={(e) => setManualArgomento(e.target.value)}
              className="input w-full mt-1 min-h-[56px]"
              maxLength={1000}
              rows={2}
              placeholder="Es. dritto, rovescio a una mano…"
            />
          </label>
          <button type="button" className="btn-primary w-fit" onClick={handleManual} disabled={submitting}>
            Registra consumo
          </button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Carnet</h2>
        <div className="space-y-6">
          {entitlements.map((e) => (
            <div key={e.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {e.kind === 'private' ? 'Privato' : 'Coppia'} · {e.primary_name}
                    {e.partner_name ? ` / ${e.partner_name}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">Assegnato da {e.assigned_by_name}</p>
                </div>
                <div className="flex gap-2">
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="text-sm text-amber-700 dark:text-amber-400"
                        onClick={() => setUndoId(e.id)}
                      >
                        Annulla ultima
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600"
                        onClick={() => setDeleteId(e.id)}
                      >
                        Elimina carnet
                      </button>
                    </>
                  )}
                </div>
              </div>
              <VirtualTicket used={e.lessons_used} total={e.lessons_total} />
            </div>
          ))}
          {entitlements.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">Nessun carnet.</p>
          )}
        </div>
      </Card>

      {approveId && (
        <div className="fixed inset-0 z-[3002] flex items-center justify-center p-4 bg-black/50" role="dialog">
          <Card className="max-w-md w-full p-4 space-y-3">
            <h3 className="font-semibold">Convalida lezione</h3>
            <select value={appCourt} onChange={(e) => setAppCourt(e.target.value)} className="input w-full">
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} className="input w-full" />
            <select value={appSlot} onChange={(e) => setAppSlot(e.target.value)} className="input w-full">
              {SLOT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={appMaestro} onChange={(e) => setAppMaestro(e.target.value)} className="input w-full">
              {maestros.map((m) => (
                <option key={m.id} value={m.id}>
                  {displayName(m)}
                </option>
              ))}
            </select>
            <label className="block text-sm text-slate-600 dark:text-slate-400">
              Argomento (opzionale)
              <textarea
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                className="input w-full mt-1 min-h-[64px]"
                maxLength={1000}
                rows={2}
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setApproveId(null)}>
                Chiudi
              </button>
              <button type="button" className="btn-primary" onClick={handleApprove} disabled={submitting}>
                Approva
              </button>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Elimina carnet"
        message="Eliminare definitivamente questo carnet e lo storico consumi?"
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDialog
        open={!!undoId}
        title="Annulla ultima lezione"
        message="Verrà rimosso l’ultimo consumo e, se presente, la prenotazione campo."
        confirmLabel="Annulla"
        cancelLabel="Chiudi"
        onConfirm={handleUndo}
        onCancel={() => setUndoId(null)}
      />
    </div>
  );
}
