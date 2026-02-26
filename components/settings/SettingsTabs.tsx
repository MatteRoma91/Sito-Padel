'use client';

import { useState, useEffect } from 'react';
import { Palette, FileText, Users, Activity, Server, RefreshCw, Wrench, Images } from 'lucide-react';
import { ColorsTab } from './ColorsTab';
import { TextsTab } from './TextsTab';
import { UsersTab } from './UsersTab';
import { AccessiTab } from './AccessiTab';
import { ServerTab } from './ServerTab';
import { RicalcolaTab } from './RicalcolaTab';
import { StrumentiTab } from './StrumentiTab';
import { GalleriaTab } from './GalleriaTab';
import type { ServerStats } from '@/lib/server-stats';

export type SettingsTabId = 'colori' | 'testi' | 'utenti' | 'accessi' | 'server' | 'ricalcola' | 'strumenti' | 'galleria';

interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
}

interface SettingsTabsProps {
  config: Record<string, string>;
  users: { id: string; username: string; full_name: string | null; nickname: string | null; role: string; is_hidden: number }[];
  initialTab?: SettingsTabId;
  usersWithLoginCounts: UserWithLoginCount[];
  serverStats: ServerStats;
  completedTournamentsCount: number;
}

export function SettingsTabs({
  config,
  users,
  initialTab = 'colori',
  usersWithLoginCounts,
  serverStats,
  completedTournamentsCount,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const tabs: { id: SettingsTabId; label: string; icon: typeof Palette }[] = [
    { id: 'colori', label: 'Colori', icon: Palette },
    { id: 'testi', label: 'Testi', icon: FileText },
    { id: 'utenti', label: 'Utenti', icon: Users },
    { id: 'accessi', label: 'Accessi', icon: Activity },
    { id: 'server', label: 'Server', icon: Server },
    { id: 'galleria', label: 'Galleria', icon: Images },
    { id: 'ricalcola', label: 'Ricalcola', icon: RefreshCw },
    { id: 'strumenti', label: 'Strumenti', icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-primary-100 dark:border-primary-300/50 pb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 min-h-[2.75rem] px-4 py-2 rounded-lg font-medium transition ${
                activeTab === t.id
                  ? 'bg-accent-500/20 text-slate-800 dark:text-slate-100 border border-accent-500/50'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-primary-100 dark:hover:bg-primary-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'colori' && <ColorsTab config={config} />}
      {activeTab === 'testi' && <TextsTab config={config} />}
      {activeTab === 'utenti' && <UsersTab users={users} />}
      {activeTab === 'accessi' && <AccessiTab usersWithLoginCounts={usersWithLoginCounts} />}
      {activeTab === 'server' && <ServerTab stats={serverStats} />}
      {activeTab === 'galleria' && <GalleriaTab />}
      {activeTab === 'ricalcola' && <RicalcolaTab completedTournamentsCount={completedTournamentsCount} />}
      {activeTab === 'strumenti' && <StrumentiTab />}
    </div>
  );
}
