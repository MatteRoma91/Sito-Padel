'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Users, Activity, Server, RefreshCw, Wrench, Images, Shield, BarChart3, LayoutGrid } from 'lucide-react';
import { StatisticheTab } from './StatisticheTab';
import { TextsTab } from './TextsTab';
import { UsersTab } from './UsersTab';
import { AccessiTab } from './AccessiTab';
import { ServerTab } from './ServerTab';
import { RicalcolaTab } from './RicalcolaTab';
import { StrumentiTab } from './StrumentiTab';
import { GalleriaTab } from './GalleriaTab';
import { LogsTab } from './LogsTab';
import { CentroSportivoTab } from './CentroSportivoTab';
import type { ServerStats } from '@/lib/server-stats';

export type SettingsTabId = 'testi' | 'utenti' | 'accessi' | 'server' | 'ricalcola' | 'strumenti' | 'galleria' | 'logs' | 'statistiche' | 'centrosportivo';

interface UserWithLoginCount {
  id: string;
  username: string;
  full_name: string | null;
  nickname: string | null;
  login_count: number;
  last_login_at: string | null;
}

interface SettingsTabsProps {
  config: Record<string, string>;
  users: { id: string; username: string; full_name: string | null; nickname: string | null; role: string; is_hidden: number }[];
  initialTab?: SettingsTabId;
  usersWithLoginCounts: UserWithLoginCount[];
  serverStats: ServerStats;
  completedTournamentsCount: number;
}

const SETTINGS_GROUPS: { id: string; label: string; items: { id: SettingsTabId; label: string; description: string; icon: typeof FileText }[] }[] = [
  {
    id: 'contenuto',
    label: 'Contenuto',
    items: [
      { id: 'testi', label: 'Testi', description: 'Nome tour, regolamento e testi del sito.', icon: FileText },
      { id: 'galleria', label: 'Galleria', description: 'Immagini e media della galleria.', icon: Images },
    ],
  },
  {
    id: 'utenti-sicurezza',
    label: 'Utenti e sicurezza',
    items: [
      { id: 'utenti', label: 'Utenti', description: 'Gestione giocatori, ruoli e visibilità.', icon: Users },
      { id: 'accessi', label: 'Accessi', description: 'Statistiche login e account bloccati.', icon: Activity },
      { id: 'logs', label: 'Log sicurezza', description: 'Login falliti, 401/403, accessi admin.', icon: Shield },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { id: 'server', label: 'Server', description: 'Memoria, CPU e uptime del processo.', icon: Server },
    ],
  },
  {
    id: 'tour-partite',
    label: 'Tour e partite',
    items: [
      { id: 'centrosportivo', label: 'Prenota un campo', description: 'Campi, orari e slot chiusi.', icon: LayoutGrid },
      { id: 'statistiche', label: 'Statistiche', description: 'Analytics e KPI del tour.', icon: BarChart3 },
    ],
  },
  {
    id: 'strumenti',
    label: 'Strumenti',
    items: [
      { id: 'ricalcola', label: 'Ricalcola', description: 'Ricalcolo punteggi tornei completati.', icon: RefreshCw },
      { id: 'strumenti', label: 'Strumenti', description: 'Backup e utilità amministrazione.', icon: Wrench },
    ],
  },
];

function getTabMeta(tabId: SettingsTabId) {
  for (const g of SETTINGS_GROUPS) {
    const item = g.items.find((i) => i.id === tabId);
    if (item) return item;
  }
  return null;
}

export function SettingsTabs({
  config,
  users,
  initialTab = 'testi',
  usersWithLoginCounts,
  serverStats,
  completedTournamentsCount,
}: SettingsTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  function selectTab(id: SettingsTabId) {
    setActiveTab(id);
    router.replace(`/settings?tab=${id}`, { scroll: false });
  }

  const meta = getTabMeta(activeTab);

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      {/* Sidebar desktop */}
      <aside className="hidden md:block w-56 shrink-0 rounded-xl border border-primary-200 dark:border-primary-300/50 bg-primary-50/50 dark:bg-surface-dark/40 py-3">
        <nav className="space-y-6">
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="px-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {group.label}
              </p>
              <ul className="mt-2 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectTab(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition rounded-r-lg border-l-2 ${
                          isActive
                            ? 'border-accent-500 bg-accent-500/15 text-slate-800 dark:text-slate-100'
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-primary-100 dark:hover:bg-primary-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile: select */}
      <div className="md:hidden">
        <label htmlFor="settings-tab-select" className="sr-only">
          Sezione impostazioni
        </label>
        <select
          id="settings-tab-select"
          value={activeTab}
          onChange={(e) => selectTab(e.target.value as SettingsTabId)}
          className="input w-full max-w-sm"
        >
          {SETTINGS_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.label}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 space-y-6">
        {meta && (
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{meta.label}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{meta.description}</p>
          </div>
        )}
        <div>
          {activeTab === 'testi' && <TextsTab config={config} />}
          {activeTab === 'utenti' && <UsersTab users={users} />}
          {activeTab === 'accessi' && <AccessiTab usersWithLoginCounts={usersWithLoginCounts} />}
          {activeTab === 'server' && <ServerTab stats={serverStats} />}
          {activeTab === 'galleria' && <GalleriaTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'statistiche' && <StatisticheTab />}
          {activeTab === 'ricalcola' && <RicalcolaTab completedTournamentsCount={completedTournamentsCount} />}
          {activeTab === 'strumenti' && <StrumentiTab />}
          {activeTab === 'centrosportivo' && <CentroSportivoTab config={config} />}
        </div>
      </div>
    </div>
  );
}
