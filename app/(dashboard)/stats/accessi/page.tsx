import { redirect } from 'next/navigation';

/** Redirect to Impostazioni > Accessi tab */
export default function AccessiPage() {
  redirect('/settings?tab=accessi');
}
