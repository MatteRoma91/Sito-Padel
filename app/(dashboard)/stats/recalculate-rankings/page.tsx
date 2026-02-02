import { redirect } from 'next/navigation';

/** Redirect to Impostazioni > Ricalcola tab */
export default function RecalculateRankingsPage() {
  redirect('/settings?tab=ricalcola');
}
