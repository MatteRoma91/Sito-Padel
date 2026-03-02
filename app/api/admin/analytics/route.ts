import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import {
  getPageViewStats,
  getUsers,
  getTournaments,
  getUsersWithLoginCounts,
} from '@/lib/db/queries';

export async function GET() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { byPath, total } = getPageViewStats();
  const users = getUsers();
  const tournaments = getTournaments();
  const completedCount = tournaments.filter((t) => t.status === 'completed').length;
  const loginCountsTop = getUsersWithLoginCounts()
    .sort((a, b) => b.login_count - a.login_count)
    .slice(0, 5);

  return NextResponse.json({
    pageViews: byPath,
    totalViews: total,
    usersCount: users.length,
    tournamentsCount: tournaments.length,
    completedTournamentsCount: completedCount,
    loginCountsTop,
  });
}
