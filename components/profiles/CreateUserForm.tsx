'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';

export function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          full_name: formData.get('full_name'),
          nickname: formData.get('nickname'),
          role: formData.get('role'),
        }),
      });

      const data = await res.json();

      if (data.success) {
        (e.target as HTMLFormElement).reset();
        setOpen(false);
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

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <span className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Aggiungi Giocatore
        </span>
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-4">
          <div className="p-3 rounded-lg bg-primary-100/70 dark:bg-surface-dark/30 text-slate-700 dark:text-slate-300 text-sm">
            La password predefinita è <strong>Padel123</strong>. Il giocatore dovrà cambiarla al primo accesso.
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="new_username" label="Username" required>
              <input
                id="new_username"
                name="username"
                type="text"
                required
                className="input"
                placeholder="mario.rossi"
                autoComplete="off"
              />
            </FormField>
            <FormField id="new_nickname" label="Nickname">
              <input
                id="new_nickname"
                name="nickname"
                type="text"
                className="input"
                placeholder="Mario"
                autoComplete="off"
              />
            </FormField>
            <FormField id="new_full_name" label="Nome completo">
              <input
                id="new_full_name"
                name="full_name"
                type="text"
                className="input"
                placeholder="Mario Rossi"
                autoComplete="name"
              />
            </FormField>
            <FormField id="new_role" label="Ruolo">
              <select id="new_role" name="role" className="input" defaultValue="player">
                <option value="player">Giocatore</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest (sola lettura)</option>
              </select>
            </FormField>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Creazione...' : 'Crea Giocatore'}
          </button>
        </form>
      )}
    </Card>
  );
}
