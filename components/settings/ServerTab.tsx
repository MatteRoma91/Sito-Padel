'use client';

import { useRouter } from 'next/navigation';
import { Server, Cpu, HardDrive, Clock, RefreshCw } from 'lucide-react';
import type { ServerStats } from '@/lib/server-stats';

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

interface ServerTabProps {
  stats: ServerStats;
}

export function ServerTab({ stats }: ServerTabProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Metriche di sistema e processo Node.js
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Memoria Sistema</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RAM totale</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(stats.totalMem)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RAM usata</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(stats.usedMem)} ({stats.memUsagePercent}%)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RAM libera</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(stats.freeMem)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <Server className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Memoria Processo</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Heap usato</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(stats.heapUsed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Heap totale</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(stats.heapTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RSS</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(stats.rss)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">CPU (Load Average)</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">1 min</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{stats.loadAvg[0].toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">5 min</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{stats.loadAvg[1].toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">15 min</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{stats.loadAvg[2].toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-primary-100 dark:border-primary-300/50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Uptime</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Processo Node.js</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatUptime(stats.procUptime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Sistema</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatUptime(stats.sysUptime)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-primary-100 dark:border-primary-300/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Sistema</h2>
        </div>
        <div className="p-4 flex flex-wrap gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 dark:text-slate-300">Hostname</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{stats.hostname}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 dark:text-slate-300">Piattaforma</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{stats.platform}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 dark:text-slate-300">Architettura</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{stats.arch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
