import type { Metadata } from 'next';
import { buildMetadata, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Cambia password',
  description: 'Cambia la tua password - Banana Padel Tour. Sito privato per membri autorizzati.',
  path: '/change-password',
  tourName: SITE_NAME,
  noIndex: true,
});

export default function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
