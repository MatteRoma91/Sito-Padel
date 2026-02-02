'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Trophy, 
  Users, 
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';

interface SidebarProps {
  user: {
    id: string;
    username: string;
    role: string;
    full_name: string | null;
    nickname: string | null;
    avatar: string | null;
  };
}

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tournaments', label: 'Tornei', icon: Trophy },
  { href: '/profiles', label: 'Giocatori', icon: Users },
  { href: '/calendar', label: 'Calendario', icon: Calendar },
  { href: '/rankings', label: 'Classifiche', icon: BarChart3 },
  { href: '/regolamento', label: 'Regolamento', icon: BookOpen },
];

const settingsNavItem = { href: '/settings', label: 'Impostazioni', icon: Settings };

const canSeeSettings = (_username: string, role: string) => role === 'admin';

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-primary-500 border-b border-primary-300 px-4 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Banana Padel Tour" width={40} height={40} className="rounded-lg" />
          <span className="font-bold text-white">Banana Padel</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-primary-300 text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-primary-500 border-r border-primary-300
        transform transition-transform duration-200 ease-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:transform-none
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-white/20 hidden md:block">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Banana Padel Tour" width={48} height={48} className="rounded-lg" />
            <span className="font-bold text-lg text-white">Banana Padel Tour</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-14 md:mt-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition
                  ${isActive 
                    ? 'bg-accent-500 text-slate-900' 
                    : 'text-white hover:bg-primary-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          {canSeeSettings(user.username, user.role) && (
            <>
              <div className="my-2 border-t border-white/20" />
              {(() => {
                const Icon = settingsNavItem.icon;
                const isActive = pathname === settingsNavItem.href || pathname.startsWith(settingsNavItem.href + '/');
                return (
                  <Link
                    key={settingsNavItem.href}
                    href={settingsNavItem.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${isActive ? 'bg-accent-500 text-slate-900' : 'text-white hover:bg-primary-300'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{settingsNavItem.label}</span>
                  </Link>
                );
              })()}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/20">
          <Link 
            href={`/profiles/${user.id}`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-lg hover:bg-primary-300 transition text-white"
          >
            <Avatar 
              src={user.avatar} 
              name={user.nickname || user.full_name || user.username} 
              size="md" 
            />
            <div className="min-w-0">
              <p className="font-medium truncate">
                {user.nickname || user.full_name || user.username}
              </p>
              <p className="text-xs text-white/80 capitalize">
                {user.role}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white hover:bg-primary-300 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>
        </div>
      </aside>
    </>
  );
}
