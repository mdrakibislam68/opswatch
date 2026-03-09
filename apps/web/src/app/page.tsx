'use client';
import { useEffect, useState } from 'react';
import { serversApi, containersApi, alertsApi, uptimeApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative, getMetricColor, formatBytes } from '@/lib/utils';
import { Server, Box, Bell, Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Wifi } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  servers: { total: number; online: number; offline: number; warning: number };
  containers: { total: number; running: number; stopped: number };
  alerts: any[];
  monitors: any[];
}

function MetricBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="metric-bar w-full">
      <div className="metric-bar-fill" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, href }: any) {
  return (
    <Link href={href || '#'} className="card card-hover p-5 flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [serverStats, containerStats, alertEvents, monitorList, serverList] = await Promise.all([
        serversApi.stats(),
        containersApi.stats(),
        alertsApi.events(10),
        uptimeApi.list(),
        serversApi.list(),
      ]);
      setStats({ servers: serverStats, containers: containerStats, alerts: alertEvents, monitors: monitorList });
      setServers(serverList.slice(0, 5));
      setAlerts(alertEvents.slice(0, 8));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('server:update', () => load());
    socket.on('alert:fired', () => load());
    return () => { socket.off('server:update'); socket.off('alert:fired'); };
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl skeleton" />)}
        </div>
      </div>
    );
  }

  const uptimeUp = stats?.monitors.filter((m: any) => m.status === 'up').length || 0;
  const uptimeTotal = stats?.monitors.length || 0;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time infrastructure monitoring</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative h-2 w-2 rounded-full bg-emerald-400"></span>
          </span>
          <span className="text-xs font-medium text-emerald-400">Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="Total Servers"
          value={stats?.servers.total || 0}
          sub={`${stats?.servers.online || 0} online · ${stats?.servers.offline || 0} offline`}
          color="bg-blue-500/10 text-blue-400"
          href="/servers"
        />
        <StatCard
          icon={Box}
          label="Containers"
          value={stats?.containers.total || 0}
          sub={`${stats?.containers.running || 0} running · ${stats?.containers.stopped || 0} stopped`}
          color="bg-purple-500/10 text-purple-400"
          href="/containers"
        />
        <StatCard
          icon={Activity}
          label="Uptime Monitors"
          value={uptimeTotal}
          sub={`${uptimeUp} healthy · ${uptimeTotal - uptimeUp} down`}
          color="bg-cyan-500/10 text-cyan-400"
          href="/uptime"
        />
        <StatCard
          icon={Bell}
          label="Recent Alerts"
          value={stats?.alerts.filter((a: any) => a.status === 'firing').length || 0}
          sub="Active incidents"
          color="bg-red-500/10 text-red-400"
          href="/alerts"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server list */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Servers</h2>
            <Link href="/servers" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {servers.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                No servers registered. <Link href="/servers" className="text-blue-400 hover:underline">Add one →</Link>
              </div>
            )}
            {servers.map((server) => (
              <Link key={server.id} href={`/servers/${server.id}`} className="flex items-center gap-4 rounded-lg p-3 hover:bg-[#1a2236] transition-colors group">
                <div className={`h-2 w-2 rounded-full shrink-0 ${
                  server.status === 'online' ? 'bg-emerald-400' :
                  server.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{server.name}</p>
                    <span className={`text-xs ${server.status === 'online' ? 'badge-online' : server.status === 'warning' ? 'badge-warning' : 'badge-offline'}`}>
                      {server.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{server.hostname}</p>
                </div>
                <div className="hidden sm:flex flex-col gap-1 w-32">
                  {server.cpuUsage != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-8">CPU</span>
                      <MetricBar value={server.cpuUsage} color={getMetricColor(server.cpuUsage)} />
                      <span className="text-[10px] text-slate-400 w-8 text-right">{server.cpuUsage?.toFixed(0)}%</span>
                    </div>
                  )}
                  {server.ramUsage != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 w-8">RAM</span>
                      <MetricBar value={server.ramUsage} color={getMetricColor(server.ramUsage)} />
                      <span className="text-[10px] text-slate-400 w-8 text-right">{server.ramUsage?.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Alert timeline */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Alert Timeline</h2>
            <Link href="/alerts" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">No recent alerts 🎉</div>
            )}
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {alert.severity === 'critical' ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{alert.ruleName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{alert.message}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{formatRelative(alert.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
