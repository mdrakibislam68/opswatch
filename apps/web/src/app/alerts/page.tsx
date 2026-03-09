'use client';
import { useEffect, useState } from 'react';
import { alertsApi, serversApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative } from '@/lib/utils';
import { Bell, Plus, Trash2, XCircle, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { toast } from '@/stores/toast.store';

const RULE_TYPES = [
  { value: 'cpu', label: 'CPU Usage' },
  { value: 'ram', label: 'RAM Usage' },
  { value: 'disk', label: 'Disk Usage' },
  { value: 'server_offline', label: 'Server Offline' },
  { value: 'container_down', label: 'Container Down' },
  { value: 'http_down', label: 'HTTP Down' },
];

const SEVERITIES: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export default function AlertsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [tab, setTab] = useState<'events' | 'rules'>('events');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'cpu', threshold: 85, operator: '>', channels: 'email',
    notifyEmail: '', telegramChatId: '', discordWebhook: '', slackWebhook: '',
    serverId: '',
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [e, r, s] = await Promise.all([alertsApi.events(50), alertsApi.rules(), serversApi.list()]);
      setEvents(e); setRules(r); setServers(s);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('alert:fired', (a: any) => {
      setEvents((prev) => [a, ...prev].slice(0, 50));
      toast.error(`Alert: ${a.ruleName}`, a.message);
    });
    return () => { socket.off('alert:fired'); };
  }, []);

  const createRule = async () => {
    try {
      const r = await alertsApi.createRule({ ...form, serverId: form.serverId || undefined });
      setRules((prev) => [r, ...prev]);
      setShowAdd(false);
      toast.success('Alert rule created');
    } catch { toast.error('Failed to create rule'); }
  };

  const deleteRule = async (id: string) => {
    try {
      await alertsApi.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('Rule deleted');
    } catch { toast.error('Failed to delete rule'); }
  };

  const hasThreshold = ['cpu', 'ram', 'disk'].includes(form.type);

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 text-sm mt-1">
            {events.filter((e) => e.status === 'firing').length} active · {rules.length} rules
          </p>
        </div>
        <button id="add-rule-btn" onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e2d4a]">
        {(['events', 'rules'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium transition-colors capitalize border-b-2 -mb-px ${tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t}
            {t === 'events' && events.length > 0 && <span className="ml-2 text-xs bg-[#1e2d4a] rounded-full px-1.5 py-0.5">{events.length}</span>}
          </button>
        ))}
      </div>

      {/* Add rule modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white">Create Alert Rule</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Rule Name</label>
                <input className="input" placeholder="High CPU Alert" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Trigger Type</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {RULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {hasThreshold && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Threshold (%)</label>
                  <input type="number" className="input" min={1} max={100} value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} />
                </div>
              )}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Server (optional)</label>
                <select className="input" value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value })}>
                  <option value="">All Servers</option>
                  {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Channels</label>
                <input className="input" placeholder="email,telegram,discord,slack" value={form.channels} onChange={(e) => setForm({ ...form, channels: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-[#1e2d4a]">
              <p className="text-xs font-medium text-slate-400">Notification Settings</p>
              <input className="input" placeholder="Email address" value={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })} />
              <input className="input" placeholder="Telegram Chat ID" value={form.telegramChatId} onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })} />
              <input className="input" placeholder="Discord Webhook URL" value={form.discordWebhook} onChange={(e) => setForm({ ...form, discordWebhook: e.target.value })} />
              <input className="input" placeholder="Slack Webhook URL" value={form.slackWebhook} onChange={(e) => setForm({ ...form, slackWebhook: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={createRule} className="btn-primary flex-1 justify-center" disabled={!form.name}>Create Rule</button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      {tab === 'events' && (
        <div className="space-y-2">
          {loading && [1,2,3,4,5].map((i) => <div key={i} className="h-16 rounded-xl skeleton" />)}
          {!loading && events.length === 0 && (
            <div className="card p-12 text-center">
              <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No alerts fired</p>
              <p className="text-sm text-slate-600 mt-1">Everything is running fine 🎉</p>
            </div>
          )}
          {events.map((event) => (
            <div key={event.id} className={`card px-5 py-4 flex items-start gap-4 border ${SEVERITIES[event.severity]}`}>
              <div className="mt-0.5">
                {event.severity === 'critical' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{event.ruleName}</span>
                  <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border ${SEVERITIES[event.severity]}`}>{event.severity}</span>
                  {event.serverName && <span className="text-xs text-slate-500">{event.serverName}</span>}
                </div>
                <p className="text-sm text-slate-300 mt-0.5">{event.message}</p>
              </div>
              <span className="text-xs text-slate-600 shrink-0">{formatRelative(event.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rules list */}
      {tab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 && !loading && (
            <div className="card p-12 text-center">
              <Shield size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No alert rules</p>
              <p className="text-sm text-slate-600 mt-1">Create rules to get notified when issues occur</p>
            </div>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="card p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">{rule.name}</h3>
                  <span className="text-xs text-slate-500 bg-[#1e2d4a] px-2 py-0.5 rounded">{rule.type}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {rule.threshold ? `Triggers when ${rule.type.toUpperCase()} ${rule.operator} ${rule.threshold}%` : `Triggers on ${rule.type.replace('_', ' ')}`}
                  {' · '}Channels: {rule.channels}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${rule.isActive ? 'badge-online' : 'badge-offline'}`}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => deleteRule(rule.id)} className="btn-ghost px-2 py-1.5 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
