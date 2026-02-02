'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COLOR_KEYS = [
  'color_accent_50', 'color_accent_100', 'color_accent_200', 'color_accent_300', 'color_accent_400',
  'color_accent_500', 'color_accent_600', 'color_accent_700', 'color_accent_800', 'color_accent_900',
  'color_primary_50', 'color_primary_100', 'color_primary_200', 'color_primary_300', 'color_primary_400',
  'color_primary_500', 'color_primary_600', 'color_primary_700', 'color_primary_800', 'color_primary_900',
] as const;

const LABELS: Record<string, string> = {
  color_accent_50: 'Accent 50', color_accent_100: 'Accent 100', color_accent_200: 'Accent 200',
  color_accent_300: 'Accent 300', color_accent_400: 'Accent 400', color_accent_500: 'Accent 500',
  color_accent_600: 'Accent 600', color_accent_700: 'Accent 700', color_accent_800: 'Accent 800',
  color_accent_900: 'Accent 900',
  color_primary_50: 'Primary 50', color_primary_100: 'Primary 100', color_primary_200: 'Primary 200',
  color_primary_300: 'Primary 300', color_primary_400: 'Primary 400', color_primary_500: 'Primary 500',
  color_primary_600: 'Primary 600', color_primary_700: 'Primary 700', color_primary_800: 'Primary 800',
  color_primary_900: 'Primary 900',
};

interface ColorsTabProps {
  config: Record<string, string>;
}

export function ColorsTab({ config }: ColorsTabProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    COLOR_KEYS.reduce((acc, k) => ({ ...acc, [k]: config[k] || '#000000' }), {})
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const update = (key: string, val: string) => {
    setValues((v) => ({ ...v, [key]: val }));
    setMessage(null);
  };

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'ok', text: 'Colori salvati. Ricarica la pagina per vedere le modifiche.' });
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

  async function handleResetDefaults() {
    if (!confirm('Ripristinare tutti i colori ai valori predefiniti?')) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'ok', text: 'Colori ripristinati. Ricarica la pagina.' });
        router.refresh();
        window.location.reload();
      } else {
        setMessage({ type: 'err', text: data.error || 'Errore' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {COLOR_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="color"
              value={values[key] || '#000000'}
              onChange={(e) => update(key, e.target.value)}
              className="w-12 h-12 rounded cursor-pointer border border-slate-300 dark:border-slate-600 bg-white"
            />
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                {LABELS[key]}
              </label>
              <input
                type="text"
                value={values[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                className="input py-1.5 text-sm font-mono"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? 'Salvataggio...' : 'Salva colori'}
        </button>
        <button type="button" onClick={handleResetDefaults} disabled={saving} className="btn btn-secondary">
          Ripristina default
        </button>
      </div>
    </div>
  );
}
