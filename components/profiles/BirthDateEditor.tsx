'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cake } from 'lucide-react';

function formatBirthdayDisplay(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const m = birthDate.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(2000, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

interface BirthDateEditorProps {
  userId: string;
  birthDate: string | null;
  canEdit: boolean;
  embedded?: boolean;
}

export function BirthDateEditor({ userId, birthDate, canEdit, embedded }: BirthDateEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(birthDate || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatted = formatBirthdayDisplay(birthDate);

  async function handleSave() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ birth_date: value === '' ? null : value }),
        cache: 'no-store',
      });
      const text = await res.text();
      let data: { success?: boolean; error?: string };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError(res.ok ? 'Risposta non valida' : `Errore server (${res.status})`);
        return;
      }
      if (data.success) {
        setSuccess('Data di nascita aggiornata');
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

  if (embedded) {
    return (
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Cake className="w-5 h-5 text-accent-500" />
          Data di nascita
        </h2>
        <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
          {formatted ? `Compleanno: ${formatted}` : 'Non impostata'}
        </p>
        {canEdit && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Imposta o modifica
            </label>
            <input
              name="birth_date"
              type="date"
              defaultValue={birthDate || ''}
              className="input max-w-xs"
            />
          </div>
        )}
      </div>
    );
  }

  const content = (
    <>
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
        <Cake className="w-5 h-5 text-accent-500" />
        Data di nascita
      </h2>
      <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
        {formatted ? `Compleanno: ${formatted}` : 'Non impostata'}
      </p>
      {canEdit && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Imposta o modifica
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="input max-w-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Salvataggio...' : 'Salva'}
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
        </div>
      )}
    </>
  );

  return <div className="card p-6">{content}</div>;
}
