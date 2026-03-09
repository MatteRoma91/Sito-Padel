'use client';

import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Dashboard error:', error.message);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Si è verificato un errore
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          Qualcosa è andato storto. Puoi riprovare oppure tornare alla home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={reset} className="btn btn-primary">
            Riprova
          </button>
          <Link href="/" className="btn btn-secondary">
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
