import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGalleryTotalSize, getGalleryMediaCount } from '@/lib/db/queries';

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 403 });
  }

  const totalSize = getGalleryTotalSize();
  const count = getGalleryMediaCount();
  const usedGB = (totalSize / 1024 / 1024 / 1024);
  const limitGB = 20;
  const freeGB = Math.max(0, limitGB - usedGB);

  return NextResponse.json({
    totalSize,
    usedGB: Math.round(usedGB * 100) / 100,
    freeGB: Math.round(freeGB * 100) / 100,
    limitGB,
    count,
  });
}
