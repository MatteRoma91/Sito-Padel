'use client';

import { useEffect, useState } from 'react';

type SerwistLike = {
  register: (opts?: { immediate?: boolean }) => Promise<ServiceWorkerRegistration | undefined>;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
  messageSkipWaiting: () => void;
};

function getSerwist(): SerwistLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as { serwist?: SerwistLike }).serwist;
}

export function RegisterPWA() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onWaiting = () => setUpdateAvailable(true);
    const onControllerChange = () => window.location.reload();

    const setup = async () => {
      const serwist = getSerwist();
      if (serwist) {
        await serwist.register();
        serwist.addEventListener('waiting', onWaiting);
      } else {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      }
    };

    void setup();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      const s = getSerwist();
      if (s?.removeEventListener) s.removeEventListener('waiting', onWaiting);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    const serwist = getSerwist();
    if (serwist?.messageSkipWaiting) {
      serwist.messageSkipWaiting();
    } else {
      navigator.serviceWorker.ready.then((reg) => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 p-4 rounded-lg shadow-lg bg-primary text-primary-foreground flex flex-col gap-2"
      role="alert"
    >
      <p className="text-sm font-medium">È disponibile una nuova versione.</p>
      <button
        type="button"
        onClick={handleUpdate}
        className="self-start px-3 py-1.5 rounded bg-white/20 hover:bg-white/30 text-sm font-medium transition"
      >
        Aggiorna
      </button>
    </div>
  );
}
