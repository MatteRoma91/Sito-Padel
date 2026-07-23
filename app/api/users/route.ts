import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createUser, getUserByUsername, getUsers } from '@/lib/db/queries';
import { createUserSchema, parseOrThrow, ValidationError } from '@/lib/validations';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const users = getUsers();

  // Never expose password_hash; hide skill_level from non-admins
  const safeUsers = users.map((u) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, skill_level, ...rest } = u;
    if (currentUser.role === 'admin') {
      return { ...rest, skill_level };
    }
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
    const body = await request.json();
    const data = parseOrThrow(createUserSchema, body);
    const { username, full_name, nickname, role } = data;

    // Check if username exists
    const existing = getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Username già in uso' }, { status: 400 });
    }

    // Password generata random se non fornita; l'utente deve cambiarla al primo login
    const id = createUser({
      username,
      password: data.password,
      full_name: full_name || undefined,
      nickname: nickname || undefined,
      role: role || 'player',
      mustChangePassword: true,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
