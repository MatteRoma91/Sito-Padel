import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import { CreateTournamentForm } from '@/components/tournaments/CreateTournamentForm';

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/tournaments');
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/tournaments" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-[#B2FF00] dark:hover:text-[#c4ff33] transition">
        <ArrowLeft className="w-4 h-4" />
        Torna ai tornei
      </Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
          Nuovo Torneo
        </h1>
        <CreateTournamentForm />
      </div>
    </div>
  );
}
