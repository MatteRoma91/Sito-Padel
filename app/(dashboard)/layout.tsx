import { redirect } from 'next/navigation';
import { getCurrentUser, getSession } from '@/lib/auth';
import { buildMetadata, SITE_NAME } from '@/lib/seo';
import { getSiteConfig } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';
import { Sidebar } from '@/components/layout/Sidebar';

export function generateMetadata() {
  const config = getSiteConfig();
  const tourName = config.text_tour_name || SITE_NAME;
  return buildMetadata({
    title: 'Area riservata',
    description: 'Gestione tornei, classifiche e calendario padel.',
    tourName,
    noIndex: true,
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check if user must change password
  const session = await getSession();
  if (session.mustChangePassword) {
    redirect('/change-password');
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar 
        user={{
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          nickname: user.nickname,
          avatar: user.avatar,
        }}
      />
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 pt-20 md:pt-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
