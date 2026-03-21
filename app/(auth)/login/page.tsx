'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CalendarDays, ShieldCheck, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';

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

  const highlights = [
    {
      icon: Trophy,
      title: 'Tornei e bracket',
      text: 'Gestisci tappe, tabelloni e risultati in un unico posto.',
    },
    {
      icon: CalendarDays,
      title: 'Calendario',
      text: 'Date, sedi e promemoria sempre allineati con il gruppo.',
    },
    {
      icon: ShieldCheck,
      title: 'Area riservata',
      text: 'Solo membri autorizzati: dati e classifiche protette.',
    },
  ] as const;

  return (
    <div className="min-h-screen lg:flex">
      {/* Pannello brand solo desktop: non influenza layout iPhone (< lg) */}
      <aside className="relative hidden min-h-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 px-10 py-12 text-white lg:flex lg:w-[min(42%,26rem)] xl:w-[min(40%,30rem)] xl:px-14 xl:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-primary-300/15 blur-3xl" />

        <div className="relative z-[1]">
          <div className="mb-8 flex items-center gap-4">
            <Image
              src="/logo.png"
              alt=""
              width={72}
              height={72}
              className="h-[4.5rem] w-[4.5rem] rounded-2xl shadow-lg ring-2 ring-white/20"
              priority
            />
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-white/70">Portale ufficiale</p>
              <p className="text-2xl font-bold leading-tight">Banana Padel Tour</p>
            </div>
          </div>
          <h2 className="text-balance text-3xl font-bold leading-tight xl:text-4xl">
            Il tour del gruppo, organizzato e sempre aggiornato.
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
            Accedi per vedere tornei, classifiche e calendario. Su desktop hai più spazio per lavorare
            senza rinunciare alla stessa esperienza rapida su iPhone.
          </p>
        </div>

        <ul className="relative z-[1] mt-12 space-y-5">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Icon className="h-5 w-5 text-accent-300" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm leading-snug text-white/75">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-primary-500 via-primary-300 to-primary-100 p-4">
        <div className="w-full max-w-sm lg:max-w-md">
          <Card className="p-6 sm:p-8 lg:p-9 lg:shadow-xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-block lg:hidden">
                <Image
                  src="/logo.png"
                  alt="Banana Padel Tour"
                  width={100}
                  height={100}
                  sizes="(max-width: 640px) 80px, 100px"
                  className="h-20 w-20 max-w-full rounded-xl sm:h-[6.25rem] sm:w-[6.25rem]"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Banana Padel Tour</h1>
              <p className="mt-1 text-slate-700 dark:text-slate-300">Accedi per continuare</p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              aria-describedby={error ? 'login-error' : undefined}
            >
              <FormField id="username" label="Username" required>
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
              </FormField>

              <FormField id="password" label="Password" required>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                  autoComplete="current-password"
                />
              </FormField>

              {error && (
                <div
                  id="login-error"
                  className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Accesso...' : 'Accedi'}
              </button>
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-white/80">Accesso riservato ai membri autorizzati</p>
        </div>
      </div>
    </div>
  );
}
