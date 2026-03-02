'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const EXCLUDED_PREFIXES = ['/_next', '/api', '/favicon', '/logo', '/icons', '/splash'];

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    const isExcluded = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
    if (isExcluded) return;

    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
