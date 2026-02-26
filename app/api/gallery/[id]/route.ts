import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getGalleryMediaById, deleteGalleryMedia } from '@/lib/db/queries';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Solo gli admin possono eliminare i media dalla galleria.' }, { status: 403 });
  }

  const media = getGalleryMediaById(id);
  if (!media) {
    return NextResponse.json({ success: false, error: 'Media non trovato' }, { status: 404 });
  }

  try {
    const fullPath = path.join(process.cwd(), 'public', media.file_path.replace(/^\//, ''));
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }

    deleteGalleryMedia(id);

    revalidatePath('/gallery');
    revalidatePath('/settings');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gallery delete error:', error);
    return NextResponse.json({ success: false, error: 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}
