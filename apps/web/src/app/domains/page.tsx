'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { domainsApi, serversApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative } from '@/lib/utils';
import { Globe, Search, Shield, ShieldOff, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: 'badge-online',
  stale: 'badge-warning',
  inactive: 'badge-offline',
};

function DomainsContent() {
  const router = useRouter();
  const [domains, setDomains] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [serverFilter, setServerFilter] = useState('');
  const [containerSearch, setContainerSearch] = useState('');
  const [portFilter, setPortFilter] = useState('');

  const load = async () => {
    try {
      const [domainData, serverData] = await Promise.all([
        domainsApi.list({
          serverId: serverFilter || undefined,
          containerName: containerSearch || undefined,
          port: portFilter || undefined,
        }),
        serversApi.list(),
      ]);
      setDomains(domainData);
      setServers(serverData);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [serverFilter, containerSearch, portFilter]); // eslint-disable-line

  useEffect(() => {
    const socket = getSocket();
    socket.on('domains:update', ({ domains: updated }: any) => {
      setDomains((prev) => {
        const map = new Map(prev.map((d) => [d.id, d]));
        updated.forEach((d: any) => map.set(d.id, d));
        return Array.from(map.values());
      });
    });
    return () => {
      socket.off('domains:update');
    };
  }, []);

  const getServerName = (serverId: string) => {
    const s = servers.find((srv) => srv.id === serverId);
    return s?.name || serverId?.slice(0, 8);
  };

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Domains</h1>
          <p className="text-slate-400 text-sm mt-1">
            {domains.length} domain{domains.length !== 1 ? 's' : ''} discovered across all servers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="input w-48"
          value={serverFilter}
          onChange={(e) => setServerFilter(e.target.value)}
        >
          <option value="">All Servers</option>
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9 w-52"
            placeholder="Filter by container..."
            value={containerSearch}
            onChange={(e) => setContainerSearch(e.target.value)}
          />
        </div>

        <input
          className="input w-36"
          placeholder="Port..."
          type="number"
          value={portFilter}
          onChange={(e) => setPortFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2d4a] text-xs text-slate-500">
                  <th className="text-left px-5 py-3 font-medium">Domain</th>
                  <th className="text-left px-5 py-3 font-medium">Server</th>
                  <th className="text-right px-5 py-3 font-medium">Port</th>
                  <th className="text-left px-5 py-3 font-medium">Container</th>
                  <th className="text-center px-5 py-3 font-medium">SSL</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Last Seen</th>
                  <th className="text-right px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-[#1e2d4a]/40 hover:bg-[#1a2236] transition-colors group cursor-pointer"
                    onClick={() => router.push(`/domains/${d.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-blue-400 shrink-0" />
                        <span className="font-mono text-xs text-slate-200 group-hover:text-white">
                          {d.domain}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-400">
                        {getServerName(d.serverId)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-cyan-400 font-mono">
                        {d.port || '–'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-400 font-mono">
                        {d.containerName || '–'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {d.ssl ? (
                        <Shield size={14} className="inline text-emerald-400" />
                      ) : (
                        <ShieldOff size={14} className="inline text-slate-600" />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={STATUS_COLORS[d.status] || 'badge-unknown'}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-slate-600">
                        {formatRelative(d.lastSeenAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/domains/${d.id}`);
                        }}
                        className="btn-ghost py-1 px-2 text-xs gap-1 text-slate-400 hover:text-blue-400"
                        title="View details"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {domains.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-600">
                      <Globe size={36} className="mx-auto mb-2 text-slate-700" />
                      No domains discovered yet
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

export default function DomainsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl skeleton" />
          ))}
        </div>
      }
    >
      <DomainsContent />
    </Suspense>
  );
}
