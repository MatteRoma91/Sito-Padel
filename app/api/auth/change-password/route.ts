import { NextResponse } from 'next/server';
import { getCurrentUser, clearMustChangePassword } from '@/lib/auth';
import { updateUserPassword } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: 'La password deve essere di almeno 6 caratteri' 
      }, { status: 400 });
    }

    // Update password and clear the must_change_password flag
    updateUserPassword(user.id, password, true);
    
    // Update session to clear the mustChangePassword flag
    await clearMustChangePassword();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
