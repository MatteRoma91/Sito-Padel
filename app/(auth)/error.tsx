'use client';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Auth error:', error.message);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-500 via-primary-300 to-primary-100">
      <div className="card max-w-sm w-full p-6 text-center">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Si è verificato un errore
        </h2>
        <button type="button" onClick={reset} className="btn btn-primary w-full mt-4">
          Riprova
        </button>
      </div>
    </div>
  );
}
