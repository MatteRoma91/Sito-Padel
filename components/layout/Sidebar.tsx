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
  Archive,
  Activity,
  KeyRound,
  LogOut,
  Menu,
  Server,
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
  { href: '/archive', label: 'Archivio', icon: Archive },
];

const accessiNavItem = { href: '/stats/accessi', label: 'Accessi', icon: Activity };
const resetPasswordNavItem = { href: '/stats/reset-password', label: 'Reset Password', icon: KeyRound };
const serverNavItem = { href: '/stats/server', label: 'Server', icon: Server };

const canSeeAccessi = (username: string) =>
  username === 'admin' || username.toLowerCase() === 'gazzella';

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
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#3445F1] border-b border-[#6270F3] px-4 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Banana Padel Tour" width={40} height={40} className="rounded-lg" />
          <span className="font-bold text-white">Banana Padel</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-[#6270F3] text-white"
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
        w-64 bg-[#3445F1] border-r border-[#6270F3]
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
                    ? 'bg-[#B2FF00] text-slate-900' 
                    : 'text-white hover:bg-[#6270F3]'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          {(canSeeAccessi(user.username) || user.role === 'admin') && (
            <>
              <div className="my-2 border-t border-white/20" />
              {canSeeAccessi(user.username) && (() => {
                const Icon = accessiNavItem.icon;
                const isActive = pathname === accessiNavItem.href || pathname.startsWith(accessiNavItem.href + '/');
                return (
                  <Link
                    key={accessiNavItem.href}
                    href={accessiNavItem.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${isActive ? 'bg-[#B2FF00] text-slate-900' : 'text-white hover:bg-[#6270F3]'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{accessiNavItem.label}</span>
                  </Link>
                );
              })()}
              {canSeeAccessi(user.username) && (() => {
                const Icon = serverNavItem.icon;
                const isActive = pathname === serverNavItem.href || pathname.startsWith(serverNavItem.href + '/');
                return (
                  <Link
                    key={serverNavItem.href}
                    href={serverNavItem.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${isActive ? 'bg-[#B2FF00] text-slate-900' : 'text-white hover:bg-[#6270F3]'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{serverNavItem.label}</span>
                  </Link>
                );
              })()}
              {user.role === 'admin' && (() => {
                const Icon = resetPasswordNavItem.icon;
                const isActive = pathname === resetPasswordNavItem.href || pathname.startsWith(resetPasswordNavItem.href + '/');
                return (
                  <Link
                    key={resetPasswordNavItem.href}
                    href={resetPasswordNavItem.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${isActive ? 'bg-[#B2FF00] text-slate-900' : 'text-white hover:bg-[#6270F3]'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{resetPasswordNavItem.label}</span>
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
            className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-lg hover:bg-[#6270F3] transition text-white"
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
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white hover:bg-[#6270F3] transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>
        </div>
      </aside>
    </>
  );
}
