'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { MvpAdminPanel } from './MvpAdminPanel';

interface MvpAdminModalProps {
  tournamentId: string;
  tournamentName: string;
  open: boolean;
  onClose: () => void;
}

export function MvpAdminModal({ tournamentId, tournamentName, open, onClose }: MvpAdminModalProps) {
  const router = useRouter();
  const [data, setData] = useState<{
    status: { isOpen: boolean; closesAt: string | null; allVoted: boolean; participantCount: number; votedCount: number };
    voteCounts: { userId: string; voteCount: number; name: string }[];
    deadline: string | null;
    tied: { userId: string; name: string }[];
    mvpAssigned: string | null;
    needsAdminAssignment: boolean;
    participants: { userId: string; name: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && tournamentId) {
      setLoading(true);
      setError('');
      fetch(`/api/tournaments/${tournamentId}/mvp-admin`)
        .then(res => res.json())
        .then(json => {
          if (json.error) setError(json.error);
          else setData(json);
        })
        .catch(() => setError('Errore di connessione'))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [open, tournamentId]);

  function handleSuccess() {
    router.refresh();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Gestione MVP</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {loading && <p className="text-slate-600 dark:text-slate-400">Caricamento...</p>}
          {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}
          {data && !loading && (
            <MvpAdminPanel
              tournamentId={tournamentId}
              tournamentName={tournamentName}
              mvpStatus={data.status}
              voteCounts={data.voteCounts}
              deadline={data.deadline}
              tied={data.tied}
              mvpAssigned={data.mvpAssigned}
              needsAdminAssignment={data.needsAdminAssignment ?? false}
              participants={data.participants ?? []}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
