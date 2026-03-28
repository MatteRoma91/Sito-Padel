import { defaultCache } from '@serwist/next/worker';
import { CacheFirst, StaleWhileRevalidate } from 'serwist';
import { Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Match paths: /, /rankings, /tournaments, /tournaments/123, etc.
function matchSwrPaths(url: URL): boolean {
  const path = url.pathname;
  if (path === '/') return true;
  if (path.startsWith('/rankings')) return true;
  if (path.startsWith('/tournaments')) return true;
  return false;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.destination === 'document' && matchSwrPaths(url),
      handler: new StaleWhileRevalidate({ cacheName: 'pages-swr' }),
    },
    {
      matcher: ({ request }) => request.destination === 'script',
      handler: new CacheFirst({ cacheName: 'scripts' }),
    },
    {
      matcher: ({ request }) => request.destination === 'style',
      handler: new CacheFirst({ cacheName: 'styles' }),
    },
    {
      matcher: ({ request, url }) => {
        if (request.destination !== 'image') return false;
        const p = url.pathname;
        return !/^\/(logo\.png|favicon\.ico|icons\/.*)$/.test(p);
      },
      handler: new CacheFirst({ cacheName: 'images' }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    const raw = event.data?.text();
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { body: event.data?.text() || '' };
  }
  const title = payload.title || 'Banana Padel Tour';
  const options: NotificationOptions = {
    body: payload.body || '',
    data: { url: payload.url || '/' },
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && 'focus' in c) return (c as WindowClient).focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

serwist.addEventListeners();
