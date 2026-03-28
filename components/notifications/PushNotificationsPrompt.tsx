'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushNotificationsPrompt() {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);
    fetch('/api/notifications/vapid-public')
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d?.configured && d?.publicKey)))
      .catch(() => setConfigured(false));
  }, []);

  const refreshSubscriptionState = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setEnabled(!!sub);
  }, []);

  useEffect(() => {
    if (!supported || !configured) return;
    refreshSubscriptionState().catch(() => undefined);
  }, [supported, configured, refreshSubscriptionState]);

  const subscribe = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { publicKey } = await fetch('/api/notifications/vapid-public').then((r) => r.json());
      if (!publicKey) {
        setMsg('Server senza chiavi VAPID');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setMsg((e as { error?: string }).error || 'Errore iscrizione');
        return;
      }
      setEnabled(true);
      setMsg('Notifiche attivate');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Errore');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMsg('Notifiche disattivate');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Errore');
    } finally {
      setBusy(false);
    }
  };

  if (!supported || !configured) return null;

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-primary-200/50 dark:border-primary-400/30">
      <div className="flex items-start gap-3 flex-1">
        {enabled ? <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> : <BellOff className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />}
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">Notifiche tornei</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ricevi avvisi su nuovi tornei, iscrizioni e promemoria prima dell&apos;inizio.
          </p>
          {msg && <p className="text-sm mt-1 text-primary-600 dark:text-primary-300">{msg}</p>}
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={enabled ? unsubscribe : subscribe}
        className="btn btn-secondary whitespace-nowrap self-start sm:self-center"
      >
        {busy ? '…' : enabled ? 'Disattiva' : 'Attiva notifiche'}
      </button>
    </div>
  );
}
