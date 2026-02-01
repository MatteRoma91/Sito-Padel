import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getUsers, getCumulativeRankings } from '@/lib/db/queries';
import { Plus, User } from 'lucide-react';
import { CreateUserForm } from '@/components/profiles/CreateUserForm';
import { Avatar } from '@/components/ui/Avatar';

export default async function ProfilesPage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  
  const allUsers = getUsers();
  // Exclude only the 'admin' user account from the players list (not all admins)
  const users = allUsers.filter(u => u.username !== 'admin');
  const rankings = getCumulativeRankings();
  const rankingMap = new Map(rankings.map(r => [r.user_id, r.total_points]));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Giocatori</h1>
        {isAdmin && (
          <Link href="/profiles/new" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo Giocatore</span>
          </Link>
        )}
      </div>

      {/* Quick add form for admin */}
      {isAdmin && <CreateUserForm />}

      {/* Players list */}
      <div className="card divide-y divide-[#9AB0F8] dark:divide-[#6270F3]/50">
        {users.map(user => (
          <Link
            key={user.id}
            href={`/profiles/${user.id}`}
            className="flex items-center gap-4 p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/50 transition"
          >
            <Avatar 
              src={user.avatar} 
              name={user.nickname || user.full_name || user.username} 
              size="lg" 
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {user.nickname || user.full_name || user.username}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                @{user.username}
                {user.role === 'admin' && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary-100 dark:bg-[#0c1451]/30 text-[#202ca1] dark:text-[#6270F3]">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <span className="font-semibold text-[#B2FF00]">
                {rankingMap.get(user.id) || 0} pt
              </span>
            </div>
          </Link>
        ))}
        {users.length === 0 && (
          <div className="p-8 text-center text-slate-700 dark:text-slate-300">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun giocatore registrato</p>
          </div>
        )}
      </div>
    </div>
  );
}
