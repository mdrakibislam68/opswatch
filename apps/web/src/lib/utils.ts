export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatUptime(seconds: number): string {
  if (!seconds) return '–';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatRelative(date: string | Date): string {
  if (!date) return '–';
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function getMetricColor(value: number): string {
  if (value >= 90) return '#ef4444';
  if (value >= 75) return '#f59e0b';
  return '#10b981';
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'online':
    case 'running':
    case 'up': return 'text-emerald-400';
    case 'offline':
    case 'exited':
    case 'down': return 'text-red-400';
    case 'warning':
    case 'restarting': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
}
