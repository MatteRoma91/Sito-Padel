'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

/** Solo staff: scorciatoia verso /lezioni. I giocatori usano il menu Lezioni (carnet). */
export function LessonsQuickPanel(props: { role: string }) {
  const isStaff = props.role === 'admin' || props.role === 'maestro';
  if (!isStaff) return null;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Lezioni</h2>
        <Link href="/lezioni" className="text-sm text-accent-600 dark:text-accent-400 font-medium">
          Gestione completa →
        </Link>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Carnet, inbox richieste e lezioni sul campo.
      </p>
    </Card>
  );
}
