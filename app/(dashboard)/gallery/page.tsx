import nextDynamic from 'next/dynamic';
import { getCurrentUser } from '@/lib/auth';
import { getGalleryMedia, getGalleryMediaCount, getGalleryTotalSize } from '@/lib/db/queries';
import { Images } from 'lucide-react';

const GalleryView = nextDynamic(
  () => import('@/components/gallery/GalleryView').then((m) => ({ default: m.GalleryView })),
  { loading: () => <div className="h-64 animate-pulse rounded-lg bg-primary-100 dark:bg-primary-800/50" /> }
);

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';

  const initialItems = getGalleryMedia({ limit: 24, offset: 0 });
  const initialTotal = getGalleryMediaCount();
  const initialTotalSize = getGalleryTotalSize();

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <Images className="w-7 h-7 text-accent-500" />
        Galleria
      </h1>
      <p className="text-slate-700 dark:text-slate-300">
        Carica e visualizza immagini e video. Tutti possono caricare, solo gli admin possono eliminare.
      </p>
      <GalleryView
        isAdmin={!!isAdmin}
        initialItems={initialItems}
        initialTotal={initialTotal}
        initialTotalSize={initialTotalSize}
      />
    </div>
  );
}
