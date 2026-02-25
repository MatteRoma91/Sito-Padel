import { NextResponse } from 'next/server';
import { getCurrentUser, clearMustChangePassword } from '@/lib/auth';
import { updateUserPassword } from '@/lib/db/queries';
import { changePasswordSchema, parseOrThrow, ValidationError } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autenticato' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = parseOrThrow(changePasswordSchema, body);

    // Update password and clear the must_change_password flag
    updateUserPassword(user.id, password, true);
    
    // Update session to clear the mustChangePassword flag
    await clearMustChangePassword();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: 'Errore del server' }, { status: 500 });
  }
}
