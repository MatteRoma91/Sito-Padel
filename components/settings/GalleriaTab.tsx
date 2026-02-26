'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, HardDrive, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface GalleryStats {
  totalSize: number;
  usedGB: number;
  freeGB: number;
  limitGB: number;
  count: number;
}

interface GalleryMediaItem {
  id: string;
  filename: string;
  file_path: string;
  size_bytes: number;
  type: 'image' | 'video';
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function GalleriaTab() {
  const router = useRouter();
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [items, setItems] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/gallery/stats'),
        fetch('/api/gallery?limit=100'),
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
      if (listRes.ok) {
        const d = await listRes.json();
        setItems(d.items);
      }
    } catch {
      setStats(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card p-8 animate-pulse">
          <div className="h-8 bg-primary-200 dark:bg-primary-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-primary-200 dark:bg-primary-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Spazio galleria e gestione file
        </p>
        <div className="flex gap-2">
          <Link href="/gallery" className="btn btn-secondary">
            Apri Galleria
          </Link>
          <button
            type="button"
            onClick={() => { fetchData(); router.refresh(); }}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Aggiorna
          </button>
        </div>
      </div>

      {stats && (
        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Spazio Galleria</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700 dark:text-slate-300">
                  {stats.usedGB.toFixed(2)} GB / {stats.limitGB} GB
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  Spazio libero: {stats.freeGB.toFixed(2)} GB
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-primary-200 dark:bg-primary-700 overflow-hidden">
                <div
                  className="h-full bg-accent-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.usedGB / stats.limitGB) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {stats.count} file · Limite totale 20 GB
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Gestione Galleria</h2>
        </div>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-slate-600 dark:text-slate-400 text-sm">Nessun file in galleria.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-[#162079]/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- gallery thumbnails
                    <img
                      src={item.file_path}
                      alt=""
                      className="w-12 h-12 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Video</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                      {item.filename}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {formatBytes(item.size_bytes)} · {new Date(item.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={!!deletingId}
                  className="btn btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                  title="Elimina"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
