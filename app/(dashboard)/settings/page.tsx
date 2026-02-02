import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSiteConfig, getUsers, getUsersWithLoginCounts, getTournaments } from '@/lib/db/queries';
import { getServerStats } from '@/lib/server-stats';
import { Settings } from 'lucide-react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import type { SettingsTabId } from '@/components/settings/SettingsTabs';

function canAccessSettings(_username: string, role: string): boolean {
  return role === 'admin';
}

const VALID_TABS: SettingsTabId[] = ['colori', 'testi', 'utenti', 'accessi', 'server', 'ricalcola', 'strumenti'];

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Settings className="w-7 h-7 text-accent-500" />
        Impostazioni
      </h1>
      <p className="text-slate-700 dark:text-slate-300">
        Personalizza colori, testi, gestisci account, accessi, server, ricalcolo punteggi e strumenti.
      </p>
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
