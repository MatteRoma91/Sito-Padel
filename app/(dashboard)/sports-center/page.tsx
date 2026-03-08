import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getCourtsOrdered, getSiteConfig, getUsers } from '@/lib/db/queries';
import { SportsCenterClient } from '@/components/sports-center/SportsCenterClient';

function getAllowedDurations(config: Record<string, string>): number[] {
  const raw = config.court_allowed_durations ?? '60,90';
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n === 60 || n === 90);
}

export default async function SportsCenterPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const courts = getCourtsOrdered();
  const config = getSiteConfig();
  const allowedDurations = getAllowedDurations(config);
  const users = getUsers().filter((u) => !u.is_hidden).map((u) => ({
    id: u.id,
    nickname: u.nickname,
    full_name: u.full_name,
    username: u.username,
  }));

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <PageHeader
        title="Centro sportivo"
        subtitle="Campi e prenotazioni"
        icon={LayoutGrid}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Centro sportivo' }]}
      />
      <SportsCenterClient
        courts={courts}
        users={users}
        user={{
          id: user.id,
          role: user.role,
          nickname: user.nickname,
          full_name: user.full_name,
          username: user.username,
        }}
        allowedDurations={allowedDurations.length ? allowedDurations : [60, 90]}
      />
    </div>
  );
}
