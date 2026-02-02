import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createUser, getUserByUsername, getUsers } from '@/lib/db/queries';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const users = getUsers();
  
  // Hide skill_level from non-admin users
  const safeUsers = currentUser.role === 'admin' 
    ? users 
    : users.map(u => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { skill_level, ...rest } = u;
        return rest;
      });
  
  return NextResponse.json({ users: safeUsers });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  const canCreate = currentUser.role === 'admin';
  if (!canCreate) {
    return NextResponse.json({ success: false, error: 'Non autorizzato a creare utenti' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { username, full_name, nickname, role } = data;

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username richiesto' }, { status: 400 });
    }

    // Check if username exists
    const existing = getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username già in uso' }, { status: 400 });
    }

    // Default password is "Padel123", user must change it on first login
    const id = createUser({
      username,
      // password is optional, will use default "Padel123"
      full_name: full_name || undefined,
      nickname: nickname || undefined,
      role: role || 'player',
      mustChangePassword: true,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
