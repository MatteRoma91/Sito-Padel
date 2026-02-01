import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
import { Server, Cpu, HardDrive, Clock } from 'lucide-react';
import { RefreshButton } from './RefreshButton';
import { ServerDashboardAutoRefresh } from './ServerDashboardAutoRefresh';
import os from 'os';

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default async function ServerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const canAccess =
    user.username === 'admin' || user.username.toLowerCase() === 'gazzella';
  if (!canAccess) redirect('/');

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

  const procMem = process.memoryUsage();
  const loadAvg = os.loadavg();
  const procUptime = process.uptime();
  const sysUptime = os.uptime();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-7 h-7 text-[#B2FF00]" />
            Dashboard Server
          </h1>
          <p className="text-slate-700 dark:text-slate-200 mt-1">
            Metriche di sistema e processo Node.js
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ServerDashboardAutoRefresh />
          <RefreshButton />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Memoria Sistema */}
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#B2FF00]" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Memoria Sistema</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RAM totale</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(totalMem)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RAM usata</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(usedMem)} ({memUsagePercent}%)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RAM libera</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(freeMem)}</span>
            </div>
          </div>
        </div>

        {/* Memoria Processo */}
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center gap-2">
            <Server className="w-5 h-5 text-[#B2FF00]" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Memoria Processo</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Heap usato</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(procMem.heapUsed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Heap totale</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(procMem.heapTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">RSS</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatBytes(procMem.rss)}</span>
            </div>
          </div>
        </div>

        {/* CPU */}
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#B2FF00]" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">CPU (Load Average)</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">1 min</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{loadAvg[0].toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">5 min</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{loadAvg[1].toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">15 min</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{loadAvg[2].toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="card">
          <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#B2FF00]" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Uptime</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Processo Node.js</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatUptime(procUptime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Sistema</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatUptime(sysUptime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sistema */}
      <div className="card">
        <div className="p-4 border-b border-[#9AB0F8] dark:border-[#6270F3]/50">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Sistema</h2>
        </div>
        <div className="p-4 flex flex-wrap gap-6">
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 dark:text-slate-300">Hostname</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{os.hostname()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 dark:text-slate-300">Piattaforma</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{os.platform()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-600 dark:text-slate-300">Architettura</span>
            <span className="font-mono text-slate-900 dark:text-slate-100">{os.arch()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
