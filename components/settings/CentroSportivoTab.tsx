'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, Plus, Trash2, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';

type Court = { id: string; name: string; type: string; display_order: number };

const DAY_LABELS: Record<number, string> = {
  0: 'Domenica',
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
};

type ClosedSlot = { id: string; day_of_week: number; slot_start: string; slot_end: string };

interface CentroSportivoTabProps {
  config: Record<string, string>;
}

export function CentroSportivoTab({ config }: CentroSportivoTabProps) {
  const router = useRouter();
  const [openTime, setOpenTime] = useState(config.court_open_time ?? '08:00');
  const [closeTime, setCloseTime] = useState(config.court_close_time ?? '23:00');
  const [allow60, setAllow60] = useState(() => (config.court_allowed_durations ?? '60,90').includes('60'));
  const [allow90, setAllow90] = useState(() => (config.court_allowed_durations ?? '60,90').includes('90'));
  const [closedSlots, setClosedSlots] = useState<ClosedSlot[]>([]);
  const [loadingClosed, setLoadingClosed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('12:00');
  const [newEnd, setNewEnd] = useState('14:00');

  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [courtEdit, setCourtEdit] = useState<Record<string, { name: string; type: string; display_order: number }>>({});
  const [savingCourtId, setSavingCourtId] = useState<string | null>(null);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtType, setNewCourtType] = useState<'indoor' | 'outdoor'>('indoor');
  const [newCourtOrder, setNewCourtOrder] = useState(0);
  const [addingCourt, setAddingCourt] = useState(false);

  useEffect(() => {
    async function fetchCourts() {
      try {
        const res = await fetch('/api/sports-center/courts');
        if (res.ok) {
          const data = await res.json();
          setCourts(data.courts ?? []);
        }
      } finally {
        setLoadingCourts(false);
      }
    }
    fetchCourts();
  }, []);

  useEffect(() => {
    async function fetchClosed() {
      try {
        const res = await fetch('/api/sports-center/closed-slots');
        if (res.ok) {
          const data = await res.json();
          setClosedSlots(data.slots ?? []);
        }
      } finally {
        setLoadingClosed(false);
      }
    }
    fetchClosed();
  }, []);

  async function handleSaveConfig() {
    setSaving(true);
    setMessage(null);
    const durations: number[] = [];
    if (allow60) durations.push(60);
    if (allow90) durations.push(90);
    const court_allowed_durations = durations.length ? durations.join(',') : '60';
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_open_time: openTime,
          court_close_time: closeTime,
          court_allowed_durations,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'ok', text: 'Impostazioni salvate.' });
        router.refresh();
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddClosedSlot(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/sports-center/closed-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          day_of_week: newDay,
          slot_start: newStart,
          slot_end: newEnd,
        }),
      });
      const data = await res.json();
      if (data.success && data.slots) {
        setClosedSlots(data.slots);
        setMessage({ type: 'ok', text: 'Fascia di chiusura aggiunta.' });
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    }
  }

  async function handleDeleteClosedSlot(id: string) {
    setMessage(null);
    try {
      const res = await fetch('/api/sports-center/closed-slots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (data.success) {
        setClosedSlots((prev) => prev.filter((s) => s.id !== id));
        setMessage({ type: 'ok', text: 'Fascia rimossa.' });
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    }
  }

  function getEditValues(c: Court) {
    return courtEdit[c.id] ?? { name: c.name, type: c.type, display_order: c.display_order };
  }
  function setEditValue(courtId: string, field: 'name' | 'type' | 'display_order', value: string | number) {
    const c = courts.find((x) => x.id === courtId);
    if (!c) return;
    const prev = getEditValues(c);
    setCourtEdit((e) => ({ ...e, [courtId]: { ...prev, [field]: value } }));
  }

  async function handleSaveCourt(id: string) {
    const c = courts.find((x) => x.id === id);
    if (!c) return;
    const edit = courtEdit[id];
    if (!edit) return;
    setMessage(null);
    setSavingCourtId(id);
    try {
      const res = await fetch(`/api/sports-center/courts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: edit.name.trim(),
          type: edit.type,
          display_order: Number(edit.display_order),
        }),
      });
      const data = await res.json();
      if (data.success && data.court) {
        setCourts((prev) => prev.map((x) => (x.id === id ? data.court : x)));
        setCourtEdit((e) => {
          const next = { ...e };
          delete next[id];
          return next;
        });
        setMessage({ type: 'ok', text: 'Campo aggiornato.' });
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    } finally {
      setSavingCourtId(null);
    }
  }

  async function handleDeleteCourt(id: string) {
    if (!confirm('Eliminare questo campo? Non è possibile se esistono prenotazioni confermate.')) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/sports-center/courts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCourts((prev) => prev.filter((x) => x.id !== id));
        setCourtEdit((e) => {
          const next = { ...e };
          delete next[id];
          return next;
        });
        setMessage({ type: 'ok', text: 'Campo eliminato.' });
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    }
  }

  async function handleAddCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!newCourtName.trim()) return;
    setMessage(null);
    setAddingCourt(true);
    try {
      const res = await fetch('/api/sports-center/courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCourtName.trim(),
          type: newCourtType,
          display_order: newCourtOrder,
        }),
      });
      const data = await res.json();
      if (data.success && data.court) {
        setCourts((prev) => [...prev, data.court].sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)));
        setNewCourtName('');
        setNewCourtOrder(courts.length);
        setMessage({ type: 'ok', text: 'Campo aggiunto.' });
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    } finally {
      setAddingCourt(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
          <LayoutGrid className="w-5 h-5 text-accent-500" />
          Orari e durate
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Orari di apertura/chiusura del centro e durate consentite per le prenotazioni.
        </p>
        <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apertura</label>
            <input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chiusura</label>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Durate prenotazioni consentite</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allow60} onChange={(e) => setAllow60(e.target.checked)} />
              <span>60 minuti</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allow90} onChange={(e) => setAllow90(e.target.checked)} />
              <span>90 minuti</span>
            </label>
          </div>
          {!allow60 && !allow90 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Seleziona almeno una durata.</p>
          )}
        </div>
        <button type="button" onClick={handleSaveConfig} disabled={saving} className="btn btn-primary">
          {saving ? 'Salvataggio...' : 'Salva orari e durate'}
        </button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
          Campi
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Aggiungi, modifica o elimina i campi. L&apos;ordine determina la visualizzazione nella griglia.
        </p>
        <form onSubmit={handleAddCourt} className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome</label>
            <input
              type="text"
              value={newCourtName}
              onChange={(e) => setNewCourtName(e.target.value)}
              placeholder="Es. Campo 1"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              value={newCourtType}
              onChange={(e) => setNewCourtType(e.target.value as 'indoor' | 'outdoor')}
              className="input"
            >
              <option value="indoor">Coperto</option>
              <option value="outdoor">Scoperto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ordine</label>
            <input
              type="number"
              min={0}
              value={newCourtOrder}
              onChange={(e) => setNewCourtOrder(Number(e.target.value) || 0)}
              className="input w-20"
            />
          </div>
          <button type="submit" disabled={addingCourt || !newCourtName.trim()} className="btn btn-primary flex items-center gap-1">
            <Plus className="w-4 h-4" /> Aggiungi campo
          </button>
        </form>
        {loadingCourts ? (
          <p className="text-sm text-slate-500">Caricamento campi...</p>
        ) : courts.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun campo configurato.</p>
        ) : (
          <ul className="space-y-2">
            {courts.map((c) => {
              const edit = getEditValues(c);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <input
                    type="text"
                    value={edit.name}
                    onChange={(e) => setEditValue(c.id, 'name', e.target.value)}
                    className="input flex-1 min-w-[120px]"
                  />
                  <select
                    value={edit.type}
                    onChange={(e) => setEditValue(c.id, 'type', e.target.value)}
                    className="input w-28"
                  >
                    <option value="indoor">Coperto</option>
                    <option value="outdoor">Scoperto</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={edit.display_order}
                    onChange={(e) => setEditValue(c.id, 'display_order', Number(e.target.value) || 0)}
                    className="input w-16"
                    title="Ordine"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCourt(c.id)}
                    disabled={savingCourtId === c.id}
                    className="p-2 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                    title="Salva"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCourt(c.id)}
                    className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Slot chiusi</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Fasce orarie in cui il centro è chiuso ogni settimana (es. pausa pranzo). Non prenotabili.
        </p>
        <form onSubmit={handleAddClosedSlot} className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Giorno</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="input"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Da</label>
            <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">A</label>
            <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="input" />
          </div>
          <button type="submit" className="btn btn-primary flex items-center gap-1">
            <Plus className="w-4 h-4" /> Aggiungi
          </button>
        </form>
        {loadingClosed ? (
          <p className="text-sm text-slate-500">Caricamento...</p>
        ) : closedSlots.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna fascia di chiusura configurata.</p>
        ) : (
          <ul className="space-y-2">
            {closedSlots.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <span className="text-sm">
                  {DAY_LABELS[s.day_of_week]} {s.slot_start}–{s.slot_end}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteClosedSlot(s.id)}
                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                  title="Rimuovi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
