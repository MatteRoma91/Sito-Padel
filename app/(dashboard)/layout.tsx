import { redirect } from 'next/navigation';
import { getCurrentUser, getSession, isLessonStaffRole } from '@/lib/auth';
import { playerHasLessonEntitlement } from '@/lib/lesson-queries';
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

  const showLessonMenu =
    isLessonStaffRole(user.role) ||
    (user.role === 'player' && playerHasLessonEntitlement(user.id));

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
        showLessonMenu={showLessonMenu}
      />
      <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-auto overflow-x-hidden pt-[var(--header-mobile-offset)] md:pt-6">
        {children}
      </main>
    </div>
  );
}
