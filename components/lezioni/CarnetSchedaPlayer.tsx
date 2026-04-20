'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Circle } from 'lucide-react';

type EntSummary = {
  id: string;
  kind: string;
  lessons_total: number;
  primary_name: string | null;
};

type ConsumptionRow = {
  id: string;
  consumed_at: string;
  maestro_user_id: string | null;
  maestro_display_name: string | null;
  notes: string | null;
};

function formatRome(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  } catch {
    return iso;
  }
}

export function CarnetSchedaPlayer({ entitlement }: { entitlement: EntSummary }) {
  const [consumptions, setConsumptions] = useState<ConsumptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson-entitlements/${entitlement.id}`);
      if (!res.ok) {
        setError('Impossibile caricare il carnet');
        return;
      }
      const j = await res.json();
      const list = (j.consumptions || []) as ConsumptionRow[];
      setConsumptions(list);
      const d: Record<string, string> = {};
      for (const c of list) {
        d[c.id] = c.notes ?? '';
      }
      setDrafts(d);
    } catch {
      setError('Errore di rete');
    } finally {
      setLoading(false);
    }
  }, [entitlement.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveNotes(consumptionId: string) {
    setSaving(consumptionId);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/lesson-consumptions/${consumptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: drafts[consumptionId] ?? '' }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg('Salvato.');
        setConsumptions((prev) =>
          prev.map((c) =>
            c.id === consumptionId ? { ...c, notes: drafts[consumptionId]?.trim() || null } : c
          )
        );
      } else {
        setSaveMsg(data.error || 'Errore');
      }
    } catch {
      setSaveMsg('Errore di rete');
    } finally {
      setSaving(null);
    }
  }

  const total = entitlement.lessons_total;
  const used = consumptions.length;

  return (
    <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-slate-800/80 shadow-md overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-800/80 dark:text-amber-200/70 font-medium">
              {entitlement.kind === 'pair' ? 'Carnet coppia' : 'Carnet privato'}
            </p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{entitlement.primary_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {used}/{total} lezioni
            </p>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg hover:bg-amber-100/80 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300"
              aria-expanded={open}
              aria-label={open ? 'Nascondi dettaglio lezioni' : 'Mostra dettaglio lezioni e argomenti'}
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Caricamento…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <div
            className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start"
            role="list"
            aria-label={`Bollini lezione, ${used} su ${total} usati`}
          >
            {Array.from({ length: total }).map((_, i) => {
              const filled = i < used;
              return (
                <div
                  key={i}
                  role="listitem"
                  aria-label={filled ? `Lezione ${i + 1} registrata` : `Bollino ${i + 1} vuoto`}
                  className={`
                    w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0
                    border-2 transition-colors
                    ${
                      filled
                        ? 'border-amber-600 dark:border-amber-500 bg-amber-200/90 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100'
                        : 'border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-900/30 text-slate-400'
                    }
                  `}
                >
                  {filled ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Circle className="w-4 h-4 opacity-40" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && !loading && !error && consumptions.length > 0 && (
        <div className="border-t border-amber-200/80 dark:border-amber-900/50 px-4 sm:px-5 pb-5 pt-2 space-y-4 bg-white/40 dark:bg-slate-900/20">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">Lezioni svolte</h3>
          <ul className="space-y-4">
            {consumptions.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-200/80 dark:border-slate-600/60 p-3 bg-white/70 dark:bg-slate-900/40"
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-300 mb-2">
                  <span>
                    <span className="text-slate-500 dark:text-slate-400">Data e ora: </span>
                    {formatRome(c.consumed_at)}
                  </span>
                  <span>
                    <span className="text-slate-500 dark:text-slate-400">Maestro: </span>
                    {c.maestro_display_name || '—'}
                  </span>
                </div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Argomento (max 1000 caratteri)
                </label>
                <textarea
                  className="input w-full min-h-[72px] text-sm"
                  maxLength={1000}
                  value={drafts[c.id] ?? ''}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [c.id]: e.target.value,
                    }))
                  }
                  rows={3}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    disabled={saving === c.id}
                    onClick={() => saveNotes(c.id)}
                  >
                    {saving === c.id ? 'Salvataggio…' : 'Salva'}
                  </button>
                  <span className="text-xs text-slate-500">{(drafts[c.id] ?? '').length}/1000</span>
                </div>
              </li>
            ))}
          </ul>
          {saveMsg && <p className="text-sm text-emerald-700 dark:text-emerald-400">{saveMsg}</p>}
        </div>
      )}

      {open && !loading && !error && consumptions.length === 0 && (
        <div className="border-t border-amber-200/80 dark:border-amber-900/50 px-4 py-3 text-sm text-slate-500">
          Nessuna lezione registrata su questo carnet.
        </div>
      )}
    </div>
  );
}
