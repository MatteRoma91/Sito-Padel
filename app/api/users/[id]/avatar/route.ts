import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getUserById, updateUserAvatar } from '@/lib/db/queries';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
// @ts-expect-error - no types for heic-convert
import heicConvert from 'heic-convert';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', ''];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');

function detectFormatFromBuffer(buffer: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | 'heic' | null {
  if (buffer.length < 12) return null;
  const hex = buffer.slice(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'jpeg';
  if (hex.startsWith('89504e470d0a1a0a')) return 'png';
  if (hex.startsWith('47494638')) return 'gif';
  if (hex.startsWith('52494646') && buffer.length >= 12) return 'webp';
  const ftyp = buffer.slice(4, 12).toString('ascii');
  if (ftyp.startsWith('ftyp') && (ftyp.includes('heic') || ftyp.includes('mif1'))) return 'heic';
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  // Check authorization: must be admin or own profile
  const isAdmin = currentUser.role === 'admin';
  const isOwnProfile = currentUser.id === id;
  
  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  // Check user exists
  const user = getUserById(id);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nessun file caricato' }, { status: 400 });
    }

    // Validate file type - allow empty (camera on iOS often sends empty type)
    if (!ALLOWED_TYPES.includes(file.type) && file.type.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo file non supportato. Usa JPG, PNG, WebP o GIF.' 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ 
        success: false, 
        error: 'File troppo grande. Massimo 5MB.' 
      }, { status: 400 });
    }

    // Delete old avatar if exists
    if (user.avatar) {
      const oldPath = path.join(process.cwd(), 'public', user.avatar.replace(/^\//, ''));
      if (existsSync(oldPath)) {
        await unlink(oldPath);
      }
    }

    // Get file content
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    const detectedFormat = detectFormatFromBuffer(buffer);

    // Validate we can handle this format
    const supportedFormats = ['jpeg', 'png', 'gif', 'webp', 'heic'];
    if (!detectedFormat || !supportedFormats.includes(detectedFormat)) {
      return NextResponse.json({ success: false, error: 'Formato immagine non supportato.' }, { status: 400 });
    }

    let ext = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat;

    // Convert HEIC/HEIF to JPEG (from type or detected - camera photos on iOS are often HEIC with empty type)
    if (file.type === 'image/heic' || file.type === 'image/heif' || detectedFormat === 'heic') {
      try {
        buffer = Buffer.from(await heicConvert({ buffer, format: 'jpeg', quality: 0.9 }));
        ext = 'jpg';
      } catch (convertErr) {
        console.error('HEIC conversion error:', convertErr);
        return NextResponse.json({ success: false, error: 'Impossibile elaborare la foto. Prova con JPG o PNG.' }, { status: 400 });
      }
    }

    const filename = `${id}-${Date.now()}.${ext}`;
    const filepath = path.join(AVATARS_DIR, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Update database
    const avatarPath = `/avatars/${filename}`;
    updateUserAvatar(id, avatarPath);

    // Invalidate cache so pages show new avatar immediately
    revalidatePath(`/profiles/${id}`);
    revalidatePath('/');
    revalidatePath('/profiles');

    return NextResponse.json({ success: true, avatar: avatarPath });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante il caricamento' }, { status: 500 });
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

  // Check authorization
  const isAdmin = currentUser.role === 'admin';
  const isOwnProfile = currentUser.id === id;
  
  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  // Check user exists
  const user = getUserById(id);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 });
  }

  try {
    // Delete avatar file if exists
    if (user.avatar) {
      const avatarPath = path.join(process.cwd(), 'public', user.avatar.replace(/^\//, ''));
      if (existsSync(avatarPath)) {
        await unlink(avatarPath);
      }
    }

    // Update database
    updateUserAvatar(id, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante la rimozione' }, { status: 500 });
  }
}
