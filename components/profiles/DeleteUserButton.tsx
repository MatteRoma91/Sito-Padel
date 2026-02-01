'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setLoading(true);
    
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        router.push('/profiles');
        router.refresh();
      } else {
        alert(data.error || 'Errore durante l\'eliminazione');
      }
    } catch {
      alert('Errore di connessione');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-700 dark:text-slate-300">Confermi?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="btn btn-danger text-sm py-1 px-2"
        >
          {loading ? '...' : 'Sì'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="btn btn-secondary text-sm py-1 px-2"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
      title="Elimina utente"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );
}
