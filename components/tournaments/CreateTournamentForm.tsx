'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Court } from '@/lib/types';

export function CreateTournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(16);
  const [courts, setCourts] = useState<Court[]>([]);
  const [reserveCourts, setReserveCourts] = useState(false);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/sports-center/courts')
      .then((r) => r.ok ? r.json() : Promise.resolve({ courts: [] }))
      .then((data) => setCourts(data.courts ?? []))
      .catch(() => setCourts([]));
  }, []);

  function toggleCourt(id: string) {
    setSelectedCourtIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const numericMaxPlayers = Number(formData.get('max_players') || 16);
    const payloadMaxPlayers = numericMaxPlayers === 8 ? 8 : 16;
    const payloadCategory =
      payloadMaxPlayers === 8
        ? 'brocco_500'
        : (formData.get('category') as string | null) || 'master_1000';

    const payload: Record<string, unknown> = {
      name: formData.get('name'),
      date: formData.get('date'),
      time: formData.get('time'),
      venue: formData.get('venue'),
      category: payloadCategory,
      maxPlayers: payloadMaxPlayers,
    };
    if (reserveCourts && selectedCourtIds.length > 0) {
      payload.slot_start = slotStart;
      payload.slot_end = slotEnd;
      payload.court_ids = selectedCourtIds;
    }

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/tournaments/${data.id}`);
        router.refresh();
      } else {
        setError(data.error || 'Errore durante la creazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  // Default to next Saturday
  const nextSaturday = new Date();
  nextSaturday.setDate(nextSaturday.getDate() + (6 - nextSaturday.getDay() + 7) % 7);
  const defaultDate = nextSaturday.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Nome Torneo *
        </label>
        <input
          name="name"
          type="text"
          required
          className="input"
          placeholder="es. Torneo Primavera 2024"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Categoria
        </label>
        {maxPlayers === 8 ? (
          <div className="input bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-not-allowed">
            BroccoChallenger 500 (fissata)
          </div>
        ) : (
          <select name="category" className="input" defaultValue="master_1000">
            <option value="master_1000">Master 1000</option>
            <option value="grand_slam">Grande Slam</option>
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Numero giocatori
        </label>
        <select
          name="max_players"
          className="input"
          defaultValue="16"
          required
          onChange={(e) => setMaxPlayers(Number(e.target.value) === 8 ? 8 : 16)}
        >
          <option value="16">16 (8 coppie, tabellone)</option>
          <option value="8">8 (4 coppie, girone all&apos;italiana)</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Data *
          </label>
          <input
            name="date"
            type="date"
            required
            defaultValue={defaultDate}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Orario
          </label>
          <input
            name="time"
            type="time"
            defaultValue="15:00"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Luogo
        </label>
        <input
          name="venue"
          type="text"
          className="input"
          placeholder="es. Centro Sportivo ABC"
        />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={reserveCourts}
            onChange={(e) => setReserveCourts(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Riserva slot al centro sportivo</span>
        </label>
        {reserveCourts && (
          <div className="space-y-3 pl-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">Riserva i campi per la data del torneo nella fascia oraria indicata (60 o 90 min).</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dalle</label>
                <input
                  type="time"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="input w-full"
                  step="1800"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Alle</label>
                <input
                  type="time"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="input w-full"
                  step="1800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Campi da riservare</label>
              <div className="flex flex-wrap gap-2">
                {courts.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedCourtIds.includes(c.id)}
                      onChange={() => toggleCourt(c.id)}
                    />
                    <span className="text-sm">{c.name}</span>
                  </label>
                ))}
                {courts.length === 0 && (
                  <span className="text-sm text-slate-500">Nessun campo configurato.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? 'Creazione...' : 'Crea Torneo'}
        </button>
      </div>
    </form>
  );
}
