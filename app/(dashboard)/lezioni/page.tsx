import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isLessonStaffRole } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { LezioniStaffClient } from '@/components/lezioni/LezioniStaffClient';

export default async function LezioniPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isLessonStaffRole(user.role)) redirect('/');

  return (
    <div className="max-w-5xl w-full mx-auto space-y-8">
      <PageHeader
        title="Lezioni e carnet"
        subtitle="Gestione carnet, richieste di allenamento e lezioni sul campo."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Lezioni' }]}
      />
      <LezioniStaffClient isAdmin={user.role === 'admin'} />
    </div>
  );
}
