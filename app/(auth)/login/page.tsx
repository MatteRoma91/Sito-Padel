'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.mustChangePassword) {
          router.push('/change-password');
        } else {
          router.push('/');
        }
        router.refresh();
      } else {
        setError(data.error || 'Errore durante il login');
      }
    } catch {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-500 via-primary-300 to-primary-100">
      <div className="w-full max-w-sm">
        <div className="card p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <Image src="/logo.png" alt="Banana Padel Tour" width={100} height={100} sizes="(max-width: 640px) 80px, 100px" className="rounded-xl max-w-full h-auto w-20 h-20 sm:w-[6.25rem] sm:h-[6.25rem]" priority />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Banana Padel Tour</h1>
            <p className="text-slate-700 dark:text-slate-300 mt-1">Accedi per continuare</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Accesso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/80 text-sm mt-6">
          Sito privato - Solo membri autorizzati
        </p>
      </div>
    </div>
  );
}
