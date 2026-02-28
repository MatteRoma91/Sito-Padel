'use client';

import dynamic from 'next/dynamic';

export const ChatLayoutLazy = dynamic(
  () => import('./ChatLayout').then(m => ({ default: m.ChatLayout })),
  { ssr: false, loading: () => <div className="card p-6 animate-pulse h-96 rounded-lg" /> }
);
