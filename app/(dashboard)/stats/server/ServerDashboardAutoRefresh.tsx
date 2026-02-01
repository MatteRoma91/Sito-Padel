'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ServerDashboardAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        id = setInterval(() => router.refresh(), 2000);
      }
    }

    function stop() {
      if (id) {
        clearInterval(id);
        id = null;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') start();
      else stop();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    start();
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
    };
  }, [router]);

  return (
    <span className="text-xs text-slate-600 dark:text-slate-300">Aggiornamento ogni 2s (solo quando visibile)</span>
  );
}
