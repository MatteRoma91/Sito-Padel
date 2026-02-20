import type { Metadata } from 'next';
import { buildMetadata, SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Accedi',
  description: 'Accedi al portale Banana Padel Tour per gestire tornei, classifiche e calendario. Sito privato per membri autorizzati.',
  path: '/login',
  tourName: SITE_NAME,
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
