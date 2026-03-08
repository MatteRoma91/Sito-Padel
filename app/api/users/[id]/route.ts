import { NextResponse } from 'next/server';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { getUserById, updateUser, updateUserPassword, deleteUser } from '@/lib/db/queries';
import { updateUserSchema, parseOrThrow, ValidationError } from '@/lib/validations';
import type { UserRole, SkillLevel, FieldSide, Hand } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const user = getUserById(id);
  if (!user) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 });
  }

  // Don't expose password hash and hide skill_level from non-admins
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, skill_level, ...baseUser } = user;
  
  // Only include skill_level for admins
  const safeUser = currentUser.role === 'admin' 
    ? { ...baseUser, skill_level } 
    : baseUser;
    
  return NextResponse.json({ user: safeUser });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  if (!canEdit(currentUser)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }

  const isAdmin = currentUser.role === 'admin';
  const isOwnProfile = currentUser.id === id;

  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  try {
    const body = await request.json();
    let data: { full_name?: string | null; nickname?: string | null; role?: UserRole; skill_level?: string | null; overall_score?: number | null; bio?: string | null; preferred_side?: string | null; preferred_hand?: string | null; birth_date?: string | null; is_hidden?: boolean; new_password?: string };
    try {
      data = parseOrThrow(updateUserSchema, body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }
    const { full_name, nickname, role, skill_level, overall_score, bio, preferred_side, preferred_hand, birth_date, is_hidden, new_password } = data;

    // Can manage hidden flag (admin only)
    const canManageHidden = isAdmin;

    // Update profile info
    const updates: {
      full_name?: string | null; 
      nickname?: string | null; 
      role?: UserRole; 
      skill_level?: SkillLevel | null;
      overall_score?: number | null;
      bio?: string | null;
      preferred_side?: FieldSide | null;
      preferred_hand?: Hand | null;
      birth_date?: string | null;
      is_hidden?: number;
    } = {};
    
    if (full_name !== undefined) updates.full_name = full_name;
    if (nickname !== undefined) updates.nickname = nickname;
    if (role !== undefined && isAdmin) updates.role = role as UserRole;
    if (skill_level !== undefined && isAdmin) updates.skill_level = skill_level as SkillLevel | null;
    if (overall_score !== undefined && isAdmin) {
      const v = overall_score === null ? null : Math.max(0, Math.min(100, overall_score));
      updates.overall_score = v;
    }
    
    // Bio is only editable by the profile owner (not admin unless it's their own profile)
    if (bio !== undefined && isOwnProfile) updates.bio = bio as string | null;
    
    // Side and hand are editable by owner or admin
    if (preferred_side !== undefined && (isOwnProfile || isAdmin)) {
      updates.preferred_side = preferred_side as FieldSide | null;
    }
    if (preferred_hand !== undefined && (isOwnProfile || isAdmin)) {
      updates.preferred_hand = preferred_hand as Hand | null;
    }
    if (birth_date !== undefined && (isOwnProfile || isAdmin)) {
      updates.birth_date = birth_date === '' || birth_date == null ? null : (birth_date as string);
    }
    
    // is_hidden can only be set by admin or Gazzella
    if (is_hidden !== undefined && canManageHidden) {
      updates.is_hidden = is_hidden ? 1 : 0;
    }

    if (Object.keys(updates).length > 0) {
      updateUser(id, updates);
    }

    // Update password if provided
    if (new_password && (isAdmin || isOwnProfile)) {
      updateUserPassword(id, new_password);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }
  if (!canEdit(currentUser)) {
    return NextResponse.json({ success: false, error: 'Utente in sola lettura' }, { status: 403 });
  }

  const canDelete = currentUser.role === 'admin';
  if (!canDelete) {
    return NextResponse.json({ success: false, error: 'Non autorizzato a eliminare utenti' }, { status: 403 });
  }

  // Prevent deleting self
  if (currentUser.id === id) {
    return NextResponse.json({ success: false, error: 'Non puoi eliminare te stesso' }, { status: 400 });
  }

  try {
    deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
