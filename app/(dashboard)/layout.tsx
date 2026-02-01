import { redirect } from 'next/navigation';
import { getCurrentUser, getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { Sidebar } from '@/components/layout/Sidebar';

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
      <main className="flex-1 p-4 md:p-6 lg:p-8 pt-20 md:pt-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
