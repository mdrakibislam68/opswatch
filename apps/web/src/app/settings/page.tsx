'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';
import { User, Key, Shield, Copy, RefreshCw, Terminal } from 'lucide-react';

// Fix: Add usersApi to lib/api.ts inline here
async function generateApiKey(id: string) {
  const { api } = await import('@/lib/api');
  return api.post(`/users/${id}/api-key`).then((r: any) => r.data);
}
async function updateUser(id: string, data: any) {
  const { api } = await import('@/lib/api');
  return api.put(`/users/${id}`, data).then((r: any) => r.data);
}

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'api' | 'notifications'>('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', password: '' });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    setLoading(true);
    try {
      await updateUser(user.id, profileForm);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setLoading(false); }
  };

  const changePassword = async () => {
    setLoading(true);
    try {
      await updateUser(user.id, { password: passwordForm.password });
      setPasswordForm({ current: '', password: '' });
      toast.success('Password changed');
    } catch { toast.error('Failed to change password'); }
    finally { setLoading(false); }
  };

  const genApiKey = async () => {
    try {
      const { apiKey: key } = await generateApiKey(user.id);
      setApiKey(key);
      toast.success('API key generated');
    } catch { toast.error('Failed to generate API key'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // agentEnvExample used in the UI below

  return (
    <div className="p-6 space-y-6 animate-fadeIn max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account and configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1e2d4a]">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'api', label: 'API Keys', icon: Key },
          { id: 'notifications', label: 'Agent Setup', icon: Terminal },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2"><User size={16} className="text-blue-400" /> Profile Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Full Name</label>
                <input className="input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
                <input className="input" type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1 border-t border-[#1e2d4a]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-lg font-bold text-white">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.role?.toUpperCase()} · {user?.email}</p>
              </div>
            </div>
            <button onClick={saveProfile} disabled={loading} className="btn-primary">Save Profile</button>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2"><Shield size={16} className="text-blue-400" /> Change Password</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Current Password</label>
                <input className="input" type="password" placeholder="••••••••" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">New Password</label>
                <input className="input" type="password" placeholder="Min. 8 characters" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} />
              </div>
            </div>
            <button onClick={changePassword} disabled={loading || !passwordForm.password} className="btn-primary">Update Password</button>
          </div>

          <div className="card p-6 border-red-500/20">
            <h2 className="text-base font-semibold text-red-400 mb-3">Danger Zone</h2>
            <button onClick={logout} className="btn-danger">Sign Out</button>
          </div>
        </div>
      )}

      {/* API tab */}
      {tab === 'api' && (
        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2"><Key size={16} className="text-blue-400" /> Personal API Key</h2>
            <p className="text-sm text-slate-400">Use this key to access the OpsWatch API programmatically.</p>
            {apiKey ? (
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Your API Key (save it now – it won't be shown again)</label>
                <div className="flex items-center gap-2 bg-[#0a0e1a] rounded-lg p-3 border border-emerald-500/30">
                  <code className="font-mono text-xs text-emerald-300 flex-1 break-all">{apiKey}</code>
                  <button onClick={() => copyToClipboard(apiKey)} className="text-slate-400 hover:text-white shrink-0">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-[#0a0e1a] rounded-lg p-3 border border-[#1e2d4a]">
                <code className="font-mono text-xs text-slate-600 flex-1">••••••••••••••••••••••••••••••••</code>
              </div>
            )}
            <button onClick={genApiKey} className="btn-primary">
              <RefreshCw size={14} /> {apiKey ? 'Regenerate Key' : 'Generate Key'}
            </button>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="text-base font-semibold text-white">API Documentation</h2>
            <p className="text-sm text-slate-400">Interactive Swagger docs available at:</p>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/api/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-mono underline underline-offset-4"
            >
              /api/docs ↗
            </a>
            <div className="pt-2 space-y-2 text-sm">
              {[
                ['GET /api/v1/servers', 'List all servers'],
                ['POST /api/v1/metrics/ingest', 'Agent metric push (API key)'],
                ['POST /api/v1/containers/sync', 'Agent container sync (API key)'],
                ['GET /api/v1/alerts/events', 'Alert history'],
                ['GET /api/v1/uptime', 'Uptime monitors'],
              ].map(([endpoint, desc]) => (
                <div key={endpoint} className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0a0e1a] border border-[#1e2d4a]">
                  <code className="font-mono text-xs text-cyan-300 shrink-0">{endpoint}</code>
                  <span className="text-slate-500 text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Setup tab */}
      {tab === 'notifications' && (
        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Terminal size={16} className="text-blue-400" /> Install Agent (One-liner)
            </h2>
            <p className="text-sm text-slate-400">Run this on any Linux server to install and start the OpsWatch agent:</p>
            <div className="relative">
              <pre className="bg-[#0a0e1a] rounded-xl border border-[#1e2d4a] p-4 text-xs font-mono text-cyan-300 overflow-x-auto">
{`curl -fsSL https://your-opswatch.com/install-agent.sh | bash`}
              </pre>
              <button
                onClick={() => copyToClipboard('curl -fsSL https://your-opswatch.com/install-agent.sh | bash')}
                className="absolute top-3 right-3 text-slate-500 hover:text-white"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Manual Docker Agent Setup</h2>
            <p className="text-sm text-slate-400">Or run the agent as a Docker container:</p>
            <div className="relative">
              <pre className="bg-[#0a0e1a] rounded-xl border border-[#1e2d4a] p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
{`docker run -d \\
  --name opswatch-agent \\
  --restart unless-stopped \\
  -e OPSWATCH_API_URL=https://your-server.com/api/v1 \\
  -e OPSWATCH_API_KEY=agent_xxxxxxxxxxxx \\
  -e OPSWATCH_INTERVAL=10 \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  opswatch/agent:latest`}
              </pre>
              <button
                onClick={() => copyToClipboard(`docker run -d --name opswatch-agent --restart unless-stopped -e OPSWATCH_API_URL=https://your-server.com/api/v1 -e OPSWATCH_API_KEY=agent_xxxxxxxxxxxx -v /var/run/docker.sock:/var/run/docker.sock opswatch/agent:latest`)}
                className="absolute top-3 right-3 text-slate-500 hover:text-white"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Agent Environment Variables</h2>
            <div className="space-y-2">
              {[
                ['OPSWATCH_API_URL', 'Your OpsWatch API URL', 'http://localhost:4000/api/v1'],
                ['OPSWATCH_API_KEY', 'Agent API key (from Servers page)', 'agent_xxxxx'],
                ['OPSWATCH_INTERVAL', 'Metric push interval in seconds', '10'],
              ].map(([key, desc, example]) => (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-[#0a0e1a] border border-[#1e2d4a]">
                  <code className="font-mono text-xs text-yellow-300 shrink-0 w-48">{key}</code>
                  <div>
                    <p className="text-xs text-slate-400">{desc}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Example: <span className="text-slate-500">{example}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
