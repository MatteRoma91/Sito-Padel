import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUnreadCountForUser } from '@/lib/db/chat-queries';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
  }

  const count = getUnreadCountForUser(user.id);
  return NextResponse.json({ success: true, count });
}
