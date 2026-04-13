'use client';

/**
 * Obbligatorio come Client Component con <html>/<body> propri.
 * Evita errori di prerender su /_global-error con Next 16 + Serwist.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-900 text-white antialiased p-6">
        <h1 className="text-xl font-semibold mb-2">Si è verificato un errore</h1>
        <p className="text-slate-300 text-sm mb-4">
          {error.message || 'Errore imprevisto. Riprova tra qualche istante.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-lime-400 px-4 py-2 text-sm font-medium text-slate-900"
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
