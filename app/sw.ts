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
      matcher: ({ request }) => request.destination === 'image',
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
serwist.addEventListeners();
