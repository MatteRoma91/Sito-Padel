import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSiteConfig, getUsers, getUsersWithLoginCounts, getTournaments, logSecurityEvent } from '@/lib/db/queries';
import { getServerStats } from '@/lib/server-stats';
import { Settings, Users, Trophy, Server } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

const SettingsTabs = dynamic(() => import('@/components/settings/SettingsTabs').then((m) => ({ default: m.SettingsTabs })), {
  loading: () => <div className="card p-6 h-64 animate-pulse rounded-lg" />,
});
import type { SettingsTabId } from '@/components/settings/SettingsTabs';

function canAccessSettings(_username: string, role: string): boolean {
  return role === 'admin';
}

const VALID_TABS: SettingsTabId[] = ['colori', 'testi', 'utenti', 'accessi', 'server', 'ricalcola', 'strumenti', 'galleria', 'logs', 'statistiche'];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!canAccessSettings(user.username, user.role)) {
    redirect('/');
  }

  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown';
  logSecurityEvent({ type: 'admin_access', ip, username: user.username, path: '/settings' });

  const params = await searchParams;
  const tabParam = params.tab;
  const initialTab: SettingsTabId = tabParam && VALID_TABS.includes(tabParam as SettingsTabId)
    ? (tabParam as SettingsTabId)
    : 'colori';

  const config = getSiteConfig();
  const allUsers = getUsers();
  const users = allUsers.map((u) => ({
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    nickname: u.nickname,
    role: u.role,
    is_hidden: u.is_hidden ?? 0,
  }));

  const usersWithLoginCounts = getUsersWithLoginCounts();
  const serverStats = getServerStats();
  const tournaments = getTournaments();
  const completedTournamentsCount = tournaments.filter((t) => t.status === 'completed').length;
  const totalUsers = users.length;
  const totalTournaments = tournaments.length;
  const loginsLast7Days = usersWithLoginCounts.reduce((sum, u) => sum + (u.login_count ?? 0), 0);

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      <PageHeader
        title="Pannello amministrazione"
        subtitle="Riepilogo e gestione centralizzata di impostazioni, utenti, accessi, server e strumenti del Banana Padel Tour."
        icon={Settings}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Pannello amministrazione' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/40">
              <Users className="w-5 h-5 text-accent-500" />
            </span>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Utenti attivi</p>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{totalUsers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/40">
              <Trophy className="w-5 h-5 text-accent-500" />
            </span>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Tornei (totali / completati)</p>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                {totalTournaments} <span className="text-sm text-slate-600 dark:text-slate-400">/ {completedTournamentsCount}</span>
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/40">
              <Server className="w-5 h-5 text-accent-500" />
            </span>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Accessi ultimi 7 giorni</p>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{loginsLast7Days}</p>
            </div>
          </div>
        </Card>
      </div>
      <SettingsTabs
        config={config}
        users={users}
        initialTab={initialTab}
        usersWithLoginCounts={usersWithLoginCounts}
        serverStats={serverStats}
        completedTournamentsCount={completedTournamentsCount}
      />
    </div>
  );
}
