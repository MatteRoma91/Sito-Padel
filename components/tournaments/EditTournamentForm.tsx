'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tournament } from '@/lib/types';

interface EditTournamentFormProps {
  tournament: Tournament;
}

export function EditTournamentForm({ tournament }: EditTournamentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          date: formData.get('date'),
          time: formData.get('time'),
          venue: formData.get('venue'),
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/tournaments/${tournament.id}`);
        router.refresh();
      } else {
        setError(data.error || 'Errore durante il salvataggio');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        router.push('/tournaments');
        router.refresh();
      } else {
        setError(data.error || 'Errore durante l\'eliminazione');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome Torneo *
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={tournament.name}
            className="input"
          />
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
              defaultValue={tournament.date}
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
              defaultValue={tournament.time || ''}
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
            defaultValue={tournament.venue || ''}
            className="input"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
      </form>

      {/* Delete section */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-red-600 mb-2">Zona Pericolosa</h3>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-300">Sei sicuro?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-danger text-sm py-1"
            >
              {deleting ? 'Eliminazione...' : 'Sì, elimina'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn btn-secondary text-sm py-1"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-danger"
          >
            Elimina Torneo
          </button>
        )}
      </div>
    </div>
  );
}
