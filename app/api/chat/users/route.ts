import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/db/queries';
import { canSeeHiddenUsers } from '@/lib/visibility';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const allUsers = getUsers();
  const visible = canSeeHiddenUsers(user)
    ? allUsers
    : allUsers.filter(u => !u.is_hidden);

  const list = visible
    .filter(u => u.id !== user.id)
    .map(u => ({
      id: u.id,
      full_name: u.full_name,
      nickname: u.nickname,
      username: u.username,
    }))
    .sort((a, b) => {
      const na = (a.nickname || a.full_name || a.username) ?? '';
      const nb = (b.nickname || b.full_name || b.username) ?? '';
      return na.localeCompare(nb);
    });

  return NextResponse.json({ success: true, users: list });
}
