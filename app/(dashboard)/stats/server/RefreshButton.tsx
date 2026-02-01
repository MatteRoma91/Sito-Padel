'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.refresh()}
      className="btn btn-secondary flex items-center gap-2"
    >
      <RefreshCw className="w-4 h-4" />
      Aggiorna
    </button>
  );
}
