import { getIronSession, SessionOptions, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { getUserByUsername, getUserById, incrementLoginCount } from './db/queries';
import type { User } from './types';

export interface SessionData {
  userId?: string;
  username?: string;
  role?: string;
  mustChangePassword?: boolean;
  isLoggedIn: boolean;
  sessionCreatedAt?: number;
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 2; // 2 ore

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_iron_session',
  cookieName: 'padel-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;

  // Verifica scadenza sessione (2 ore)
  if (session.sessionCreatedAt) {
    const elapsed = Date.now() - session.sessionCreatedAt;
    if (elapsed > SESSION_MAX_AGE_SECONDS * 1000) {
      session.destroy();
      return null;
    }
  } else {
    // Sessione legacy: imposta sessionCreatedAt per dare 2h dalla prima verifica
    session.sessionCreatedAt = Date.now();
    await session.save();
  }

  const user = getUserById(session.userId);
  return user || null;
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }> {
  const user = getUserByUsername(username);
  if (!user) {
    return { success: false, error: 'Username o password non validi' };
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return { success: false, error: 'Username o password non validi' };
  }

  const mustChangePassword = user.must_change_password === 1;

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.role = user.role;
  session.mustChangePassword = mustChangePassword;
  session.isLoggedIn = true;
  session.sessionCreatedAt = Date.now();
  await session.save();

  incrementLoginCount(user.id);

  return { success: true, mustChangePassword };
}

export async function clearMustChangePassword(): Promise<void> {
  const session = await getSession();
  session.mustChangePassword = false;
  await session.save();
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn && session.role === 'admin';
}
