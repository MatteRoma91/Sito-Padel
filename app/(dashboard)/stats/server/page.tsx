import { redirect } from 'next/navigation';

/** Redirect to Impostazioni > Server tab */
export default function ServerDashboardPage() {
  redirect('/settings?tab=server');
}
