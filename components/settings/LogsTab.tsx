'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { SimpleTable } from '@/components/ui/SimpleTable';
import { Card } from '@/components/ui/Card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatItalyDateTimeFromSqliteUtc } from '@/lib/datetime';

interface SecurityLog {
  id: number;
  type: string;
  ip: string | null;
  username: string | null;
  path: string | null;
  created_at: string;
}

export function LogsTab() {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTypeFilter, setLogsTypeFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'ids'; ids: number[] } | { type: 'before' } | null>(null);

  const fetchSecurityLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (logsTypeFilter) params.set('type', logsTypeFilter);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSecurityLogs(data.logs || []);
        setLogsTotal(data.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, [logsTypeFilter]);

  useEffect(() => {
    fetchSecurityLogs();
  }, [fetchSecurityLogs]);

  async function handleDeleteLogs(ids: number[]) {
    setDeleteConfirm(null);
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        fetchSecurityLogs();
      }
    } catch {
      // ignore
    }
  }

  async function handleDeleteLogsBefore() {
    setDeleteConfirm(null);
    const before = new Date();
    before.setDate(before.getDate() - 7);
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before: before.toISOString() }),
      });
      if (res.ok) {
        fetchSecurityLogs();
      }
    } catch {
      // ignore
    }
  }

  return (
    <>
    <Card>
      <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
        <FileText className="w-5 h-5 text-accent-500" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Log di sicurezza</h2>
      </div>
      <p className="p-4 pt-0 text-sm text-slate-700 dark:text-slate-300">
        Login falliti, 401/403, accessi admin, eventi lezioni/carnet. Totale: {logsTotal}.
      </p>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={logsTypeFilter}
            onChange={(e) => setLogsTypeFilter(e.target.value)}
            className="input w-auto max-w-[180px]"
            aria-label="Filtra per tipo"
          >
            <option value="">Tutti i tipi</option>
            <option value="login_failed">Login fallito</option>
            <option value="auth_401">401</option>
            <option value="auth_403">403</option>
            <option value="admin_access">Accesso admin</option>
            <option value="lesson_event">Eventi lezioni/carnet</option>
          </select>
          <button
            type="button"
            onClick={() => fetchSecurityLogs()}
            disabled={logsLoading}
            className="btn btn-secondary text-sm"
          >
            {logsLoading ? 'Caricamento...' : 'Aggiorna'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm({ type: 'before' })}
            className="btn btn-secondary text-sm text-amber-600 hover:text-amber-700"
          >
            Elimina log &gt;7 giorni
          </button>
        </div>
        {logsLoading && securityLogs.length === 0 ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">Caricamento...</p>
        ) : securityLogs.length === 0 ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">Nessun log.</p>
        ) : (
          <SimpleTable
            headers={[
              'Tipo',
              'IP',
              'Username',
              'Path',
              'Data',
              <span key="azioni" className="sr-only">
                Azioni
              </span>,
            ]}
            caption="Registro degli eventi di sicurezza recenti."
          >
            {securityLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-primary-100 dark:border-primary-700/50 hover:bg-primary-50 dark:hover:bg-primary-800/30"
                  >
                <td className="py-2 px-2 text-slate-800 dark:text-slate-200">{log.type}</td>
                <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{log.ip ?? '-'}</td>
                <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{log.username ?? '-'}</td>
                    <td
                      className="py-2 px-2 text-slate-600 dark:text-slate-400 truncate max-w-[180px]"
                      title={log.path ?? ''}
                    >
                      {log.path ?? '-'}
                    </td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatItalyDateTimeFromSqliteUtc(log.created_at)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ type: 'ids', ids: [log.id] })}
                        className="text-slate-500 hover:text-red-500 p-1"
                        aria-label={`Elimina log del ${formatItalyDateTimeFromSqliteUtc(log.created_at)}`}
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
            ))}
          </SimpleTable>
        )}
      </div>
    </Card>

    {deleteConfirm && (
      <ConfirmModal
        open={!!deleteConfirm}
        title="Elimina log"
        message={
          deleteConfirm.type === 'before'
            ? 'Eliminare tutti i log più vecchi di 7 giorni? Questa azione non può essere annullata.'
            : `Eliminare ${deleteConfirm.ids.length} log selezionati?`
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="danger"
        onConfirm={() =>
          deleteConfirm.type === 'before' ? handleDeleteLogsBefore() : handleDeleteLogs(deleteConfirm.ids)
        }
        onCancel={() => setDeleteConfirm(null)}
      />
    )}
    </>
  );
}
