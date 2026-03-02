'use client';

import { ToastProvider } from '@/components/ui/Toast';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PageViewTracker />
      {children}
    </ToastProvider>
  );
}
