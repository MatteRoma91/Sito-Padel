'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';

const SECTIONS: { title: string; keys: readonly string[] }[] = [
  { title: 'Generale', keys: ['text_tour_name', 'text_welcome_subtitle'] as const },
  { title: 'Regolamento – Classifica', keys: ['text_regolamento_title', 'text_regolamento_classifica_intro', 'text_regolamento_classifica_punti', 'text_regolamento_classifica_medaglie'] as const },
  { title: 'Regolamento – Overall', keys: ['text_regolamento_overall_intro', 'text_regolamento_overall_delta', 'text_regolamento_overall_livelli', 'text_regolamento_overall_baseline'] as const },
  { title: 'Regolamento – Compleanno', keys: ['text_regolamento_compleanno_title', 'text_regolamento_compleanno_1', 'text_regolamento_compleanno_2'] as const },
];

const LABELS: Record<string, string> = {
  text_tour_name: 'Nome tour',
  text_welcome_subtitle: 'Sottotitolo benvenuto (home)',
  text_regolamento_title: 'Titolo regolamento',
  text_regolamento_classifica_intro: 'Classifica intro',
  text_regolamento_classifica_punti: 'Classifica punti',
  text_regolamento_classifica_medaglie: 'Classifica medaglie',
  text_regolamento_overall_intro: 'Overall intro',
  text_regolamento_overall_delta: 'Overall delta',
  text_regolamento_overall_livelli: 'Overall livelli',
  text_regolamento_overall_baseline: 'Overall baseline',
  text_regolamento_compleanno_title: 'Compleanno titolo',
  text_regolamento_compleanno_1: 'Compleanno paragrafo 1',
  text_regolamento_compleanno_2: 'Compleanno paragrafo 2',
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
  const initialValues = useMemo(
    () => SECTIONS.flatMap((s) => [...s.keys]).reduce((acc, k) => ({ ...acc, [k]: config[k] || '' }), {} as Record<string, string>),
    [config]
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initialValues }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setValues({ ...initialValues });
  }, [initialValues]);

  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some((k) => (values[k] ?? '') !== (initialValues[k] ?? ''));
  }, [values, initialValues]);

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
    <Card className="p-6 space-y-6">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}
          role="alert"
        >
          {message.text}
        </div>
      )}
      {SECTIONS.map((section) => (
        <div key={section.title} className="rounded-xl bg-primary-50/50 dark:bg-[#0c1451]/30 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-b border-primary-200 dark:border-primary-600 pb-2">
            {section.title}
          </h3>
          <div className="space-y-4">
            {section.keys.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {LABELS[key]}
                </label>
                {USE_TEXTAREA.has(key) ? (
                  <textarea
                    value={values[key] || ''}
                    onChange={(e) => update(key, e.target.value)}
                    className="input min-h-[100px] resize-y"
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
        </div>
      ))}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !isDirty}
        className="btn btn-primary"
      >
        {saving ? 'Salvataggio...' : 'Salva testi'}
      </button>
    </Card>
  );
}
