'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, Image as ImageIcon, Video } from 'lucide-react';

interface GalleryMediaItem {
  id: string;
  filename: string;
  file_path: string;
  size_bytes: number;
  type: 'image' | 'video';
  mime_type: string;
  user_id: string;
  created_at: string;
}

interface GalleryViewProps {
  isAdmin: boolean;
  initialItems?: GalleryMediaItem[];
  initialTotal?: number;
  initialTotalSize?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function GalleryView({ isAdmin, initialItems = [], initialTotal = 0, initialTotalSize = 0 }: GalleryViewProps) {
  const [items, setItems] = useState<GalleryMediaItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [totalSize, setTotalSize] = useState(initialTotalSize);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<GalleryMediaItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchItems = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gallery?page=${pageNum}&limit=24`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore nel caricamento');
      setItems(data.items);
      setTotal(data.total);
      setTotalSize(data.totalSize);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialItems.length === 0 && initialTotal === 0) {
      fetchItems(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    setError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/gallery', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload fallito');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fallito');
        setUploading(false);
        e.target.value = '';
        return;
      }
    }

    setUploading(false);
    e.target.value = '';
    await fetchItems(1);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eliminazione fallita');
      if (selectedItem?.id === id) setSelectedItem(null);
      await fetchItems(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eliminazione fallita');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / 24) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Galleria</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {total} file · {formatBytes(totalSize)} usati
          </p>
        </div>
        <label className="btn btn-primary flex items-center gap-2 cursor-pointer">
          <Upload className="w-5 h-5" />
          Carica file
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      </div>

      {uploading && (
        <div className="card p-4 bg-accent-500/10 border-accent-500/30">
          <p className="text-sm text-slate-700 dark:text-slate-300">Caricamento in corso...</p>
        </div>
      )}

      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-primary-100 dark:bg-primary-800/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Nessuna immagine o video.</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Clicca &quot;Carica file&quot; per iniziare.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg overflow-hidden bg-primary-100 dark:bg-primary-800/50"
              >
                <button
                  type="button"
                  className="block w-full h-full"
                  onClick={() => setSelectedItem(item)}
                >
                  {item.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- gallery dynamic user uploads
                    <img
                      src={item.file_path}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                      <video
                        src={item.file_path}
                        className="max-w-full max-h-full object-contain"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <Video className="absolute w-12 h-12 text-white/80" />
                    </div>
                  )}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    disabled={deletingId === item.id}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500/90 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fetchItems(page - 1)}
                disabled={page <= 1}
                className="btn btn-secondary"
              >
                Precedente
              </button>
              <span className="flex items-center px-4 text-sm text-slate-600 dark:text-slate-400">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => fetchItems(page + 1)}
                disabled={page >= totalPages}
                className="btn btn-secondary"
              >
                Successiva
              </button>
            </div>
          )}
        </>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element -- gallery lightbox
              <img
                src={selectedItem.file_path}
                alt=""
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={selectedItem.file_path}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            )}
            <div className="mt-2 flex justify-between items-center text-white">
              <span className="text-sm">{formatBytes(selectedItem.size_bytes)}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedItem.id)}
                  disabled={deletingId === selectedItem.id}
                  className="btn bg-red-500 hover:bg-red-600 text-white"
                >
                  Elimina
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
