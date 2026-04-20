import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isLessonStaffRole } from '@/lib/auth';
import { listLessonEntitlementsForPlayer } from '@/lib/lesson-queries';
import { PageHeader } from '@/components/layout/PageHeader';
import { LezioniStaffClient } from '@/components/lezioni/LezioniStaffClient';
import { LezioniPlayerClient } from '@/components/lezioni/LezioniPlayerClient';

export default async function LezioniPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (isLessonStaffRole(user.role)) {
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

  const entitlements = listLessonEntitlementsForPlayer(user.id);
  if (entitlements.length === 0) {
    redirect('/');
  }

  return (
    <div className="max-w-5xl w-full mx-auto space-y-8">
      <PageHeader
        title="Le tue lezioni"
        subtitle="Carnet assegnati, richiesta data/ora e richieste in attesa."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Lezioni' }]}
      />
      <LezioniPlayerClient />
    </div>
  );
}
