'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';

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
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; filename: string } | null>(null);

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!deleteConfirm || deleteConfirm.id !== id) return;
    setDeleteConfirm(null);
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
        <Card className="p-8 animate-pulse">
          <div className="h-8 bg-primary-200 dark:bg-primary-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-primary-200 dark:bg-primary-700 rounded w-2/3" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Spazio galleria e gestione file
        </p>
        <div className="flex gap-2">
          <Link href="/gallery" className="btn btn-secondary">
            Apri Galleria
          </Link>
          <button
            type="button"
            onClick={() => { fetchData(true); router.refresh(); }}
            disabled={refreshing}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Aggiornamento...' : 'Aggiorna'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Spazio usato</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.usedGB.toFixed(2)} GB</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Limite</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.limitGB} GB</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">File</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.count}</p>
          </Card>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Ultimi file</h2>
        </div>
        <div className="divide-y divide-primary-100 dark:divide-primary-300/50 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-slate-600 dark:text-slate-400 text-sm">Nessun file in galleria.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 hover:bg-primary-50 dark:hover:bg-surface-primary/20"
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
                  onClick={() => setDeleteConfirm({ id: item.id, filename: item.filename })}
                  disabled={!!deletingId}
                  className="btn btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                  title="Elimina"
                >
                  {deletingId === item.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {deleteConfirm && (
        <ConfirmModal
          open={!!deleteConfirm}
          title="Elimina file"
          message={`Eliminare il file "${deleteConfirm.filename}"? Questa azione non può essere annullata.`}
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          variant="danger"
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
