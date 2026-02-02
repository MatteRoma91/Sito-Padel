'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Database, KeyRound, Download, Archive } from 'lucide-react';

export function StrumentiTab() {
  const [downloading, setDownloading] = useState(false);
  const [downloadingFull, setDownloadingFull] = useState(false);

  async function handleFullBackup() {
    setDownloadingFull(true);
    // #region agent log
    fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:handleFullBackup',message:'entry',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      const res = await fetch('/api/settings/backup/full');
      // #region agent log
      fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:afterFetch',message:'response',data:{ok:res.ok,status:res.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // #region agent log
        fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:!res.ok',message:'error response',data:{status:res.status,error:data?.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        alert(data.error || 'Errore durante il download del backup completo');
        return;
      }
      // #region agent log
      fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:beforeBlob',message:'calling res.blob()',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      const blob = await res.blob();
      // #region agent log
      fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:afterBlob',message:'blob received',data:{size:blob.size,type:blob.type},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] || `padel-full-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // #region agent log
      fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:beforeClick',message:'triggering download',data:{filename},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // #region agent log
      fetch('http://localhost:7242/ingest/32a405fc-93a5-4f78-9f85-2878b9bc3205',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StrumentiTab.tsx:catch',message:'exception',data:{err:String(e)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      alert('Errore di connessione');
    } finally {
      setDownloadingFull(false);
    }
  }

  async function handleBackup() {
    setDownloading(true);
    try {
      const res = await fetch('/api/settings/backup');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Errore durante il download del backup');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] || `padel-backup-${new Date().toISOString().slice(0, 10)}.db`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Errore di connessione');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Archive className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Backup completo</h2>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          Scarica un archivio ZIP con database e tutti gli avatar. Usalo per reinstallare l&apos;applicazione su un altro server senza perdere dati.
        </p>
        <button
          type="button"
          onClick={handleFullBackup}
          disabled={downloadingFull}
          className="btn btn-primary flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          {downloadingFull ? 'Download...' : 'Scarica backup completo'}
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Backup database</h2>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          Scarica una copia del database SQLite. Utile per backup manuali prima di modifiche importanti.
        </p>
        <button
          type="button"
          onClick={handleBackup}
          disabled={downloading}
          className="btn btn-primary flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Download...' : 'Scarica backup'}
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-accent-500" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Password predefinita</h2>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          Resetta la password di un utente alla predefinita (<strong>abc123</strong>). L&apos;utente dovrà cambiarla al primo accesso.
          Puoi farlo dalla tab <strong>Utenti</strong> (icona chiave per ogni utente) o dalla sezione dedicata qui sotto.
        </p>
        <Link
          href="/settings?tab=utenti"
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <KeyRound className="w-5 h-5" />
          Vai a Utenti (reset password)
        </Link>
      </div>
    </div>
  );
}
