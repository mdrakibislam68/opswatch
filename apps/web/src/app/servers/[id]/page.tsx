'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { serversApi, metricsApi, containersApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatBytes, formatUptime, getMetricColor, formatRelative } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ArrowLeft, Server, Box, Cpu, HardDrive, Activity, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs space-y-1">
      <p className="text-slate-400">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}: <strong className="text-white">{p.value?.toFixed(1)}%</strong></span>
        </div>
      ))}
    </div>
  );
}

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [server, setServer] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState(24);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, m, c] = await Promise.all([
        serversApi.get(id),
        metricsApi.history(id, timeRange),
        containersApi.list(id),
      ]);
      setServer(s);
      setMetrics(m.map((pt: any) => ({
        time: format(new Date(pt.createdAt), 'HH:mm'),
        CPU: pt.cpuUsage,
        RAM: pt.ramUsage,
        Disk: pt.diskUsage,
      })));
      setContainers(c);
    } catch { router.push('/servers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id, timeRange]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('server:update', (s: any) => {
      if (s.id === id) setServer((prev: any) => ({ ...prev, ...s }));
    });
    socket.on(`containers:update:${id}`, (c: any[]) => setContainers(c));
    return () => { socket.off('server:update'); socket.off(`containers:update:${id}`); };
  }, [id]);

  if (loading) return <div className="p-6"><div className="h-64 rounded-xl skeleton" /></div>;
  if (!server) return null;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/servers" className="btn-ghost px-2"><ArrowLeft size={18} /></Link>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${server.status === 'online' ? 'bg-emerald-400 shadow-md shadow-emerald-400/50' : 'bg-red-400'}`} />
          <h1 className="text-2xl font-bold text-white">{server.name}</h1>
          <span className={server.status === 'online' ? 'badge-online' : 'badge-offline'}>{server.status}</span>
        </div>
        <button onClick={load} className="ml-auto btn-ghost px-2" title="Refresh"><RefreshCw size={15} /></button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'CPU Usage', value: `${server.cpuUsage?.toFixed(1) || 0}%`, icon: Cpu, color: getMetricColor(server.cpuUsage || 0) },
          { label: 'RAM Usage', value: `${server.ramUsage?.toFixed(1) || 0}%`, icon: Activity, color: getMetricColor(server.ramUsage || 0) },
          { label: 'Disk Usage', value: `${server.diskUsage?.toFixed(1) || 0}%`, icon: HardDrive, color: getMetricColor(server.diskUsage || 0) },
          { label: 'Uptime', value: formatUptime(server.uptimeSeconds), icon: Clock, color: '#06b6d4' },
        ].map((card) => (
          <div key={card.label} className="card p-4 flex items-center gap-3">
            <card.icon size={20} style={{ color: card.color }} />
            <div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="text-lg font-bold text-white" style={{ color: card.color }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Resource History</h2>
          <div className="flex gap-1">
            {[6, 12, 24, 48].map((h) => (
              <button key={h} onClick={() => setTimeRange(h)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === h ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-[#1e2d4a] hover:text-slate-300'}`}>
                {h}h
              </button>
            ))}
          </div>
        </div>
        {metrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics}>
              <defs>
                {[['cpu', '#3b82f6'], ['ram', '#10b981'], ['disk', '#f59e0b']].map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
              <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#4a5568', fontSize: 10 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="CPU" stroke="#3b82f6" fill="url(#grad-cpu)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="RAM" stroke="#10b981" fill="url(#grad-ram)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="Disk" stroke="#f59e0b" fill="url(#grad-disk)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No metrics data for this period</div>
        )}
      </div>

      {/* Containers */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Containers ({containers.length})</h2>
          <Link href={`/containers?serverId=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
        </div>
        {containers.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">No containers found on this server</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-[#1e2d4a]">
                  <th className="text-left pb-2 font-medium">Name</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-right pb-2 font-medium">CPU</th>
                  <th className="text-right pb-2 font-medium">Memory</th>
                  <th className="text-right pb-2 font-medium">Restarts</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c) => (
                  <tr key={c.id} className="border-b border-[#1e2d4a]/50 hover:bg-[#1a2236] transition-colors">
                    <td className="py-2.5 font-mono text-xs text-slate-200">{c.name}</td>
                    <td className="py-2.5">
                      <span className={c.status === 'running' ? 'badge-online' : c.status === 'restarting' ? 'badge-warning' : 'badge-offline'}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-slate-400">{c.cpuPercent?.toFixed(1) || 0}%</td>
                    <td className="py-2.5 text-right text-xs text-slate-400">{formatBytes(c.memoryUsage)}</td>
                    <td className="py-2.5 text-right text-xs text-slate-400">{c.restartCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
