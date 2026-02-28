'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

const STORAGE_KEY = 'padel_install_prompt';
const VISIT_THRESHOLD = 2;

type StoredState = {
  dismissed: boolean;
  visitCount: number;
};

function getStored(): StoredState {
  if (typeof window === 'undefined') return { dismissed: true, visitCount: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: false, visitCount: 0 };
    const parsed = JSON.parse(raw) as StoredState;
    return {
      dismissed: parsed.dismissed ?? false,
      visitCount: parsed.visitCount ?? 0,
    };
  } catch {
    return { dismissed: false, visitCount: 0 };
  }
}

function setStored(updates: Partial<StoredState>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStored();
    const next = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<
    { prompt: () => Promise<void> } | null
  >(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = getStored();
    if (stored.dismissed) return;

    // Standalone = already installed (PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as { standalone?: boolean }).standalone) return;

    const visitCount = stored.visitCount + 1;
    setStored({ visitCount });

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as { prompt?: () => Promise<void> };
      if (ev.prompt) {
        setDeferredPrompt({ prompt: ev.prompt });
        if (visitCount >= VISIT_THRESHOLD) {
          setVisible(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    if (!deferredPrompt) return;
    const stored = getStored();
    if (stored.dismissed || stored.visitCount < VISIT_THRESHOLD) return;
    setVisible(true);
  }, [deferredPrompt]);

  function handleInstall() {
    if (deferredPrompt?.prompt) {
      deferredPrompt.prompt().then(() => setVisible(false));
      setStored({ dismissed: true });
    } else {
      setVisible(false);
      setStored({ dismissed: true });
    }
  }

  function handleDismiss() {
    setVisible(false);
    setStored({ dismissed: true });
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[999] p-4 rounded-2xl shadow-lg bg-primary-900/95 border border-primary-400/50 flex flex-col gap-3 text-slate-100"
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">
            Installa Banana Padel Tour
          </h3>
          <p className="text-sm text-slate-300 mt-0.5">
            Aggiungi l&apos;app alla schermata Home per un accesso veloce
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg text-slate-400 hover:bg-primary-700/50 hover:text-slate-100"
          aria-label="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="btn btn-primary flex-1 flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Download className="w-5 h-5" />
          Installa
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="btn btn-secondary min-h-[44px]"
        >
          Non ora
        </button>
      </div>
    </div>
  );
}
