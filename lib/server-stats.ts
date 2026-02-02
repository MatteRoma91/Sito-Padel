import os from 'os';

export interface ServerStats {
  totalMem: number;
  freeMem: number;
  usedMem: number;
  memUsagePercent: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  loadAvg: [number, number, number];
  procUptime: number;
  sysUptime: number;
  hostname: string;
  platform: string;
  arch: string;
}

export function getServerStats(): ServerStats {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
  const procMem = process.memoryUsage();
  const loadAvg = os.loadavg();
  return {
    totalMem,
    freeMem,
    usedMem,
    memUsagePercent,
    heapUsed: procMem.heapUsed,
    heapTotal: procMem.heapTotal,
    rss: procMem.rss,
    loadAvg: [loadAvg[0], loadAvg[1], loadAvg[2]],
    procUptime: process.uptime(),
    sysUptime: os.uptime(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  };
}
