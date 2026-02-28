'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        showToast('Utente eliminato');
        router.push('/profiles');
        router.refresh();
      } else {
        showToast(data.error || 'Errore durante l\'eliminazione', 'error');
      }
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setShowConfirm(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
        title="Elimina utente"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <ConfirmModal
        open={showConfirm}
        title="Elimina utente"
        message="Sei sicuro di voler eliminare questo utente? L'operazione non è reversibile."
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
