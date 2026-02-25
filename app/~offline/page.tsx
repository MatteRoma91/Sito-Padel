'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)] p-6">
      <WifiOff className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-xl font-semibold mb-2">Sei offline</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        I contenuti non sono disponibili. Controlla la connessione e riprova.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
      >
        Riprova
      </button>
      <Link
        href="/"
        className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
      >
        Torna alla home
      </Link>
    </div>
  );
}
