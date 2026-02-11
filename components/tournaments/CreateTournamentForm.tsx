'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateTournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(16);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const numericMaxPlayers = Number(formData.get('max_players') || 16);
      const payloadMaxPlayers = numericMaxPlayers === 8 ? 8 : 16;
      const payloadCategory =
        payloadMaxPlayers === 8
          ? 'brocco_500'
          : (formData.get('category') as string | null) || 'master_1000';

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          date: formData.get('date'),
          time: formData.get('time'),
          venue: formData.get('venue'),
          category: payloadCategory,
          maxPlayers: payloadMaxPlayers,
        }),
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
