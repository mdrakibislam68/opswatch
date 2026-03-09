'use client';
import { useEffect, useState } from 'react';
import { serversApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative, formatUptime, getMetricColor } from '@/lib/utils';
import { Plus, Server, Copy, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/stores/toast.store';

function MetricPill({ label, value }: { label: string; value: number }) {
  const color = getMetricColor(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono" style={{ color }}>{value?.toFixed(0)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-[#1e2d4a]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value || 0, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', hostname: '' });
  const [newServer, setNewServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setServers(await serversApi.list()); }
    catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('server:update', (s: any) => {
      setServers((prev) => prev.map((p) => p.id === s.id ? { ...p, ...s } : p));
    });
    return () => { socket.off('server:update'); };
  }, []);

  const addServer = async () => {
    try {
      const created = await serversApi.create(form);
      setNewServer(created);
      setServers((prev) => [created, ...prev]);
      setForm({ name: '', hostname: '' });
      toast.success('Server registered!', 'Copy the API key below to configure your agent.');
    } catch { toast.error('Failed to add server'); }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('Delete this server and all its data?')) return;
    try {
      await serversApi.delete(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      toast.success('Server deleted');
    } catch { toast.error('Failed to delete server'); }
  };

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <p className="text-slate-400 text-sm mt-1">{servers.length} registered</p>
        </div>
        <button id="add-server-btn" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Server
        </button>
      </div>

      {/* Add server modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Register New Server</h2>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Server Name</label>
              <input className="input" placeholder="prod-web-01" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Hostname / IP</label>
              <input className="input" placeholder="192.168.1.1 or server.example.com" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} />
            </div>

            {newServer && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-400">✓ Server created! Save your API key:</p>
                <div className="flex items-center gap-2 bg-[#0a0e1a] rounded-lg p-2.5 border border-[#1e2d4a]">
                  <code className="text-xs text-cyan-300 flex-1 break-all font-mono">{newServer.apiKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newServer.apiKey); toast.success('Copied!'); }} className="text-slate-400 hover:text-white shrink-0">
                    <Copy size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-500">Set OPSWATCH_API_KEY in your agent config</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={addServer} className="btn-primary flex-1 justify-center" disabled={!form.name || !form.hostname}>
                Register
              </button>
              <button onClick={() => { setShowAdd(false); setNewServer(null); setForm({ name: '', hostname: '' }); }} className="btn-ghost">
                {newServer ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((server) => (
            <div key={server.id} className="card p-5 space-y-4 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${server.status === 'online' ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : server.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                  <div>
                    <h3 className="font-semibold text-white text-sm">{server.name}</h3>
                    <p className="text-xs text-slate-500">{server.hostname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/servers/${server.id}`} className="btn-ghost px-2 py-1.5" title="View details">
                    <ExternalLink size={13} />
                  </Link>
                  <button onClick={() => deleteServer(server.id)} className="btn-ghost px-2 py-1.5 hover:text-red-400" title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {server.cpuUsage != null && <MetricPill label="CPU" value={server.cpuUsage} />}
                {server.ramUsage != null && <MetricPill label="RAM" value={server.ramUsage} />}
                {server.diskUsage != null && <MetricPill label="Disk" value={server.diskUsage} />}
                {server.cpuUsage == null && (
                  <p className="text-xs text-slate-600 text-center py-2">No metrics yet – waiting for agent...</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#1e2d4a]">
                <span className="text-[11px] text-slate-600">
                  {server.os} · {server.arch}
                </span>
                <span className="text-[11px] text-slate-600">
                  {server.lastSeenAt ? formatRelative(server.lastSeenAt) : 'Never seen'}
                </span>
              </div>
            </div>
          ))}

          {servers.length === 0 && (
            <div className="col-span-full card p-12 text-center">
              <Server size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No servers yet</p>
              <p className="text-sm text-slate-600 mt-1">Click "Add Server" to register your first server</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
