'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { containersApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatBytes, formatRelative } from '@/lib/utils';
import { Box, Search, FileText } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  running: 'badge-online',
  exited: 'badge-offline',
  stopped: 'badge-offline',
  restarting: 'badge-warning',
  paused: 'badge-unknown',
};

function ContainersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serverId = searchParams.get('serverId');
  const [containers, setContainers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setContainers(await containersApi.list(serverId || undefined)); }
    catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [serverId]); // eslint-disable-line

  useEffect(() => {
    const socket = getSocket();
    socket.on('containers:update', ({ containers: updated }: any) => {
      setContainers((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        updated.forEach((c: any) => map.set(c.id, c));
        return Array.from(map.values());
      });
    });
    return () => { socket.off('containers:update'); };
  }, []);

  const filtered = containers.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.image?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Containers</h1>
          <p className="text-slate-400 text-sm mt-1">{containers.length} containers across all servers</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 w-56"
            placeholder="Search containers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {['all', 'running', 'exited', 'restarting'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-[#1e2d4a] hover:text-slate-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2d4a] text-xs text-slate-500">
                                  <th className="text-left px-5 py-3 font-medium">Container</th>
                  <th className="text-left px-5 py-3 font-medium">Image</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">CPU</th>
                  <th className="text-right px-5 py-3 font-medium">Memory</th>
                  <th className="text-right px-5 py-3 font-medium">Restarts</th>
                  <th className="text-right px-5 py-3 font-medium">Updated</th>
                  <th className="text-right px-5 py-3 font-medium">Logs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-[#1e2d4a]/40 hover:bg-[#1a2236] transition-colors group">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-slate-200 group-hover:text-white">{c.name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-500 font-mono truncate max-w-[200px] block">{c.image}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={STATUS_COLORS[c.status] || 'badge-unknown'}>{c.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-slate-400 font-mono">{c.cpuPercent?.toFixed(1) || '–'}%</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-slate-400">{c.memoryUsage ? formatBytes(Number(c.memoryUsage)) : '–'}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-mono ${c.restartCount > 5 ? 'text-yellow-400' : 'text-slate-400'}`}>{c.restartCount}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-slate-600">{formatRelative(c.updatedAt)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => router.push(`/containers/${c.dockerId || c.id}/logs`)}
                        className="btn-ghost py-1 px-2 text-xs gap-1 text-slate-400 hover:text-blue-400"
                        title="View logs"
                      >
                        <FileText size={12} />
                        Logs
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-600">
                      <Box size={36} className="mx-auto mb-2 text-slate-700" />
                      No containers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContainersPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-3">
        {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl skeleton" />)}
      </div>
    }>
      <ContainersContent />
    </Suspense>
  );
}
