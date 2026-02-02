import { redirect } from 'next/navigation';

/** Redirect to Impostazioni > Utenti tab (reset password available there) */
export default function ResetPasswordPage() {
  redirect('/settings?tab=utenti');
}
