'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TEXT_KEYS = [
  'text_tour_name', 'text_welcome_subtitle',
  'text_regolamento_title',
  'text_regolamento_classifica_intro', 'text_regolamento_classifica_punti', 'text_regolamento_classifica_medaglie',
  'text_regolamento_overall_intro', 'text_regolamento_overall_delta', 'text_regolamento_overall_livelli', 'text_regolamento_overall_baseline',
  'text_regolamento_compleanno_title', 'text_regolamento_compleanno_1', 'text_regolamento_compleanno_2',
] as const;

const LABELS: Record<string, string> = {
  text_tour_name: 'Nome tour',
  text_welcome_subtitle: 'Sottotitolo benvenuto (home)',
  text_regolamento_title: 'Titolo regolamento',
  text_regolamento_classifica_intro: 'Regolamento - Classifica intro',
  text_regolamento_classifica_punti: 'Regolamento - Classifica punti',
  text_regolamento_classifica_medaglie: 'Regolamento - Classifica medaglie',
  text_regolamento_overall_intro: 'Regolamento - Overall intro',
  text_regolamento_overall_delta: 'Regolamento - Overall delta',
  text_regolamento_overall_livelli: 'Regolamento - Overall livelli',
  text_regolamento_overall_baseline: 'Regolamento - Overall baseline',
  text_regolamento_compleanno_title: 'Regolamento - Compleanno titolo',
  text_regolamento_compleanno_1: 'Regolamento - Compleanno paragrafo 1',
  text_regolamento_compleanno_2: 'Regolamento - Compleanno paragrafo 2',
};

const USE_TEXTAREA = new Set([
  'text_welcome_subtitle', 'text_regolamento_classifica_intro', 'text_regolamento_classifica_punti',
  'text_regolamento_classifica_medaglie', 'text_regolamento_overall_intro', 'text_regolamento_overall_delta',
  'text_regolamento_overall_livelli', 'text_regolamento_overall_baseline', 'text_regolamento_compleanno_1',
  'text_regolamento_compleanno_2',
]);

interface TextsTabProps {
  config: Record<string, string>;
}

export function TextsTab({ config }: TextsTabProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    TEXT_KEYS.reduce((acc, k) => ({ ...acc, [k]: config[k] || '' }), {})
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
        setMessage({ type: 'ok', text: 'Testi salvati.' });
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

  return (
    <div className="card p-6 space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}
      <div className="space-y-4">
        {TEXT_KEYS.map((key) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {LABELS[key]}
            </label>
            {USE_TEXTAREA.has(key) ? (
              <textarea
                value={values[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                className="input min-h-[80px]"
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={values[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                className="input"
              />
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
        {saving ? 'Salvataggio...' : 'Salva testi'}
      </button>
    </div>
  );
}
