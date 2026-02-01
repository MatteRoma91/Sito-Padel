'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TournamentStatusChangerProps {
  tournamentId: string;
  currentStatus: string;
}

const statuses = [
  { value: 'draft', label: 'Bozza' },
  { value: 'open', label: 'Iscrizioni aperte' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'completed', label: 'Completato' },
];

export function TournamentStatusChanger({ tournamentId, currentStatus }: TournamentStatusChangerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;

    setLoading(true);
    try {
      await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Stato torneo:
      </label>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={loading}
        className="input w-auto"
      >
        {statuses.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      {loading && <span className="text-sm text-slate-600">Salvataggio...</span>}
    </div>
  );
}
