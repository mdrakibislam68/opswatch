'use client';
import { useEffect, useState } from 'react';
import { uptimeApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative } from '@/lib/utils';
import { Plus, Activity, Globe, Clock, CheckCircle, XCircle, Loader, Trash2, ExternalLink } from 'lucide-react';
import { toast } from '@/stores/toast.store';

function UptimeBadge({ status }: { status: string }) {
  if (status === 'up') return <span className="badge-online"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />UP</span>;
  if (status === 'down') return <span className="badge-offline">DOWN</span>;
  return <span className="badge-unknown">CHECKING...</span>;
}

function UptimeBar({ value }: { value: number | null }) {
  const pct = value ?? 0;
  const color = pct >= 99 ? '#10b981' : pct >= 95 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 rounded-full bg-[#1e2d4a]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono w-12 text-right" style={{ color }}>{value?.toFixed(2) ?? '–'}%</span>
    </div>
  );
}

export default function UptimePage() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', intervalSeconds: 60 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setMonitors(await uptimeApi.list()); }
    catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('uptime:update', ({ monitorId, status }: any) => {
      setMonitors((prev) => prev.map((m) => m.id === monitorId ? { ...m, status } : m));
    });
    return () => { socket.off('uptime:update'); };
  }, []);

  const addMonitor = async () => {
    try {
      const m = await uptimeApi.create({ ...form, expectedStatus: 200, timeoutMs: 5000 });
      setMonitors((prev) => [m, ...prev]);
      setShowAdd(false);
      setForm({ name: '', url: '', intervalSeconds: 60 });
      toast.success('Monitor added');
    } catch { toast.error('Failed to create monitor'); }
  };

  const deleteMonitor = async (id: string) => {
    if (!confirm('Delete this monitor?')) return;
    try {
      await uptimeApi.delete(id);
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      toast.success('Monitor deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const upCount = monitors.filter((m) => m.status === 'up').length;
  const downCount = monitors.filter((m) => m.status === 'down').length;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Uptime Monitors</h1>
          <p className="text-slate-400 text-sm mt-1">
            <span className="text-emerald-400">{upCount} up</span>
            {downCount > 0 && <> · <span className="text-red-400">{downCount} down</span></>}
            {' · '}{monitors.length} total
          </p>
        </div>
        <button id="add-monitor-btn" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Monitor
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">New Uptime Monitor</h2>
            <input className="input" placeholder="Monitor name (e.g. Production API)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="https://api.example.com/health" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Check Interval</label>
              <select
                className="input"
                value={form.intervalSeconds}
                onChange={(e) => setForm({ ...form, intervalSeconds: Number(e.target.value) })}
              >
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={300}>Every 5 minutes</option>
                <option value={600}>Every 10 minutes</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={addMonitor} className="btn-primary flex-1 justify-center" disabled={!form.name || !form.url}>Create Monitor</button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Monitor list */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-xl skeleton" />)}</div>
      ) : (
        <div className="space-y-3">
          {monitors.length === 0 && (
            <div className="card p-12 text-center">
              <Globe size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No monitors yet</p>
              <p className="text-sm text-slate-600 mt-1">Add HTTP endpoints to monitor their availability</p>
            </div>
          )}
          {monitors.map((m) => (
            <div key={m.id} className="card p-5 hover:border-blue-500/20 transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <UptimeBadge status={m.status} />
                    <h3 className="font-semibold text-white text-sm">{m.name}</h3>
                  </div>
                  <a href={m.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400 transition-colors truncate">
                    <Globe size={11} />
                    {m.url}
                    <ExternalLink size={10} />
                  </a>
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">24h Uptime</p>
                      <UptimeBar value={m.uptime24h} />
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[11px] text-slate-500">Response</p>
                        <p className="text-sm font-mono text-slate-300">{m.responseTime ? `${m.responseTime}ms` : '–'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Interval</p>
                        <p className="text-sm text-slate-300">{m.intervalSeconds}s</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Last Check</p>
                        <p className="text-sm text-slate-300">{m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : '–'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteMonitor(m.id)} className="btn-ghost px-2 py-1.5 hover:text-red-400 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
