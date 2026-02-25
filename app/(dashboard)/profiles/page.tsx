import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getUsers, getCumulativeRankings } from '@/lib/db/queries';
import { getVisibleUsers } from '@/lib/visibility';
import { User } from 'lucide-react';
import { CreateUserForm } from '@/components/profiles/CreateUserForm';
import { Avatar } from '@/components/ui/Avatar';

export const dynamic = 'force-dynamic';

export default async function ProfilesPage() {
  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  
  const allUsers = getUsers();
  // Exclude only the 'admin' user account from the players list (not all admins)
  // Also filter hidden users based on viewer permissions
  const users = getVisibleUsers(allUsers.filter(u => u.username !== 'admin'), currentUser);
  const userMap = new Map(users.map(u => [u.id, u]));

  // Stesso ordine della Classifica Generale (getCumulativeRankings è già ORDER BY total_points DESC)
  const cumulativeRankings = getCumulativeRankings();
  const rankingMap = new Map(cumulativeRankings.map(r => [r.user_id, r.total_points]));
  const rankedUserIds = new Set(cumulativeRankings.map(r => r.user_id));
  const usersInRankingOrder = cumulativeRankings
    .map(r => userMap.get(r.user_id))
    .filter((u): u is NonNullable<typeof u> => u != null);
  const usersNotInRanking = users
    .filter(u => !rankedUserIds.has(u.id))
    .sort((a, b) => (a.nickname || a.username || '').localeCompare(b.nickname || b.username || ''));
  const usersSortedByRanking = [...usersInRankingOrder, ...usersNotInRanking];

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Giocatori</h1>
      </div>

      {/* Quick add form for admin */}
      {isAdmin && <CreateUserForm />}

      {/* Players list */}
      <div className="card divide-y divide-primary-100 dark:divide-primary-300/50">
        {usersSortedByRanking.map(user => (
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
                  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <span className="font-semibold text-accent-500">
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
