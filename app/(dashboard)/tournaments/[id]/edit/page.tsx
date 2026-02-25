import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentById } from '@/lib/db/queries';
import { ArrowLeft } from 'lucide-react';
import { EditTournamentForm } from '@/components/tournaments/EditTournamentForm';

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/tournaments');
  }

  const tournament = getTournamentById(id);
  if (!tournament) {
    notFound();
  }

  return (
    <div className="max-w-xl w-full mx-auto space-y-6">
      <Link href={`/tournaments/${id}`} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-accent-500 dark:hover:text-accent-400 transition">
        <ArrowLeft className="w-4 h-4" />
        Torna al torneo
      </Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
          Modifica Torneo
        </h1>
        <EditTournamentForm tournament={tournament} />
      </div>
    </div>
  );
}
