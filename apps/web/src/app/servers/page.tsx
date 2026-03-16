'use client';
import { useEffect, useRef, useState } from 'react';
import { serversApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatRelative, getMetricColor } from '@/lib/utils';
import {
  Plus,
  Server,
  Copy,
  Trash2,
  ExternalLink,
  Terminal,
  Key,
  FileKey,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/stores/toast.store';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionType = 'script' | 'ssh' | 'aws-pem';

interface SshForm {
  name: string;
  hostname: string;
  sshUser: string;
  sshPort: string;
  privateKey: string;
  passphrase: string;
  installPath: string;
  apiUrl: string;
}

interface AwsForm {
  name: string;
  hostname: string;
  sshUser: string;
  sshPort: string;
  passphrase: string;
  installPath: string;
  apiUrl: string;
  pemFile: File | null;
}

// Returns the default agent install path based on the SSH user.
// root → system-wide /opt/opswatch; others → home directory path.
const defaultInstallPath = (user: string): string =>
  user === 'root' ? '/opt/opswatch' : `/home/${user || 'ubuntu'}/opswatch`;

interface ScriptForm {
  name: string;
  hostname: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MetricPill({ label, value }: { label: string; value: number }) {
  const color = getMetricColor(value);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono" style={{ color }}>{value?.toFixed(0)}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-[#1e2d4a]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value || 0, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Connection type tab ──────────────────────────────────────────────────────

function TypeTab({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
        active
          ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
          : 'bg-transparent border-[#1e2d4a] text-slate-500 hover:border-slate-600 hover:text-slate-300'
      }`}
    >
      <span className={`${active ? 'text-blue-400' : 'text-slate-500'}`}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-slate-600 leading-tight">{description}</span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [connType, setConnType] = useState<ConnectionType>('script');
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{
    type: 'success' | 'error';
    server?: any;
    message: string;
    log?: string;
  } | null>(null);

  const [showLog, setShowLog] = useState(false);

  // Form states
  const [scriptForm, setScriptForm] = useState<ScriptForm>({ name: '', hostname: '' });
  const [sshForm, setSshForm] = useState<SshForm>({
    name: '',
    hostname: '',
    sshUser: 'root',
    sshPort: '22',
    privateKey: '',
    passphrase: '',
    installPath: defaultInstallPath('root'),
    apiUrl: '',
  });
  const [awsForm, setAwsForm] = useState<AwsForm>({
    name: '',
    hostname: '',
    sshUser: 'ubuntu',
    sshPort: '22',
    passphrase: '',
    installPath: defaultInstallPath('ubuntu'),
    apiUrl: '',
    pemFile: null,
  });

  // Track whether the user has manually edited installPath — if so, stop auto-updating it.
  const sshPathTouched = useRef(false);
  const awsPathTouched = useRef(false);

  const pemInputRef = useRef<HTMLInputElement>(null);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const load = async () => {
    try {
      setServers(await serversApi.list());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('server:update', (s: any) => {
      setServers((prev) => prev.map((p) => (p.id === s.id ? { ...p, ...s } : p)));
    });
    return () => {
      socket.off('server:update');
    };
  }, []);

  // Auto-suggest install path when SSH user changes (unless manually overridden)
  useEffect(() => {
    if (!sshPathTouched.current) {
      setSshForm((f) => ({ ...f, installPath: defaultInstallPath(f.sshUser) }));
    }
  }, [sshForm.sshUser]);

  useEffect(() => {
    if (!awsPathTouched.current) {
      setAwsForm((f) => ({ ...f, installPath: defaultInstallPath(f.sshUser) }));
    }
  }, [awsForm.sshUser]);

  // ─── Modal helpers ─────────────────────────────────────────────────────────

  const resetModal = () => {
    setConnType('script');
    setInstalling(false);
    setInstallResult(null);
    setShowLog(false);
    setScriptForm({ name: '', hostname: '' });
    setSshForm({ name: '', hostname: '', sshUser: 'root', sshPort: '22', privateKey: '', passphrase: '', installPath: defaultInstallPath('root'), apiUrl: '' });
    setAwsForm({ name: '', hostname: '', sshUser: 'ubuntu', sshPort: '22', passphrase: '', installPath: defaultInstallPath('ubuntu'), apiUrl: '', pemFile: null });
    sshPathTouched.current = false;
    awsPathTouched.current = false;
  };

  const closeModal = () => {
    setShowAdd(false);
    resetModal();
  };

  // ─── Submissions ───────────────────────────────────────────────────────────

  const submitScript = async () => {
    try {
      const created = await serversApi.create(scriptForm);
      setInstallResult({
        type: 'success',
        server: created,
        message: 'Server registered. Copy the API key and configure your agent.',
      });
      setServers((prev) => [created, ...prev]);
      toast.success('Server registered!', 'Copy the API key to configure your agent.');
    } catch {
      setInstallResult({ type: 'error', message: 'Failed to register server.' });
      toast.error('Failed to register server');
    }
  };

  const submitSsh = async () => {
    setInstalling(true);
    setInstallResult(null);
    try {
      const result = await serversApi.addViaSsh({
        name: sshForm.name,
        hostname: sshForm.hostname,
        host: sshForm.hostname,
        sshUser: sshForm.sshUser,
        sshPort: Number(sshForm.sshPort) || 22,
        privateKey: sshForm.privateKey,
        passphrase: sshForm.passphrase || undefined,
        installPath: sshForm.installPath || undefined,
        apiUrl: sshForm.apiUrl || undefined,
      });
      setInstallResult({
        type: 'success',
        server: result.server,
        message: result.message || 'Agent installed and started successfully.',
        log: result.installLog,
      });
      setServers((prev) => [result.server, ...prev]);
      toast.success('Agent installed!', `Server "${sshForm.name}" is now being monitored.`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'SSH installation failed.';
      setInstallResult({ type: 'error', message: msg });
      toast.error('Installation failed', msg);
    } finally {
      setInstalling(false);
    }
  };

  const submitAws = async () => {
    if (!awsForm.pemFile) {
      toast.error('Please select a .pem file');
      return;
    }
    setInstalling(true);
    setInstallResult(null);
    try {
      const result = await serversApi.addViaAwsPem({
        name: awsForm.name,
        hostname: awsForm.hostname,
        host: awsForm.hostname,
        sshUser: awsForm.sshUser,
        sshPort: Number(awsForm.sshPort) || 22,
        passphrase: awsForm.passphrase || undefined,
        installPath: awsForm.installPath || undefined,
        apiUrl: awsForm.apiUrl || undefined,
        pemFile: awsForm.pemFile,
      });
      setInstallResult({
        type: 'success',
        server: result.server,
        message: result.message || 'Agent installed and started successfully.',
        log: result.installLog,
      });
      setServers((prev) => [result.server, ...prev]);
      toast.success('Agent installed!', `Server "${awsForm.name}" is now being monitored.`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'AWS PEM installation failed.';
      setInstallResult({ type: 'error', message: msg });
      toast.error('Installation failed', msg);
    } finally {
      setInstalling(false);
    }
  };

  const handleSubmit = () => {
    if (connType === 'script') return submitScript();
    if (connType === 'ssh') return submitSsh();
    if (connType === 'aws-pem') return submitAws();
  };

  const canSubmit = () => {
    if (installing) return false;
    if (connType === 'script') return !!(scriptForm.name && scriptForm.hostname);
    if (connType === 'ssh')
      return !!(sshForm.name && sshForm.hostname && sshForm.sshUser && sshForm.privateKey);
    if (connType === 'aws-pem')
      return !!(awsForm.name && awsForm.hostname && awsForm.sshUser && awsForm.pemFile);
    return false;
  };

  // ─── Server delete ─────────────────────────────────────────────────────────

  const deleteServer = async (id: string) => {
    if (!confirm('Delete this server and all its data?')) return;
    try {
      await serversApi.delete(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
      toast.success('Server deleted');
    } catch {
      toast.error('Failed to delete server');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <p className="text-slate-400 text-sm mt-1">{servers.length} registered</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Server
        </button>
      </div>

      {/* ── Add Server Modal ────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-lg p-6 space-y-5 my-8">
            <div>
              <h2 className="text-lg font-semibold text-white">Add Server</h2>
              <p className="text-xs text-slate-500 mt-0.5">Choose how to connect to the target server</p>
            </div>

            {/* Connection type selector */}
            {!installResult && (
              <div className="flex gap-2">
                <TypeTab
                  active={connType === 'script'}
                  onClick={() => setConnType('script')}
                  icon={<Terminal size={18} />}
                  label="Agent Script"
                  description="Run install script manually"
                />
                <TypeTab
                  active={connType === 'ssh'}
                  onClick={() => setConnType('ssh')}
                  icon={<Key size={18} />}
                  label="SSH Key"
                  description="Private key string"
                />
                <TypeTab
                  active={connType === 'aws-pem'}
                  onClick={() => setConnType('aws-pem')}
                  icon={<FileKey size={18} />}
                  label="AWS PEM"
                  description="Upload .pem file"
                />
              </div>
            )}

            {/* ── Result state ── */}
            {installResult && (
              <div
                className={`rounded-xl p-4 space-y-3 border ${
                  installResult.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {installResult.type === 'success' ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                  )}
                  <p
                    className={`text-sm font-medium ${
                      installResult.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {installResult.message}
                  </p>
                </div>

                {/* API key display for script method */}
                {installResult.type === 'success' && installResult.server?.apiKey && connType === 'script' && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Agent API Key — save this now:</p>
                    <div className="flex items-center gap-2 bg-[#0a0e1a] rounded-lg p-2.5 border border-[#1e2d4a]">
                      <code className="text-xs text-cyan-300 flex-1 break-all font-mono">
                        {installResult.server.apiKey}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(installResult.server.apiKey);
                          toast.success('Copied!');
                        }}
                        className="text-slate-400 hover:text-white shrink-0"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Set OPSWATCH_API_KEY in your agent config</p>
                  </div>
                )}

                {/* Install log toggle (SSH/AWS) */}
                {installResult.log && (
                  <div>
                    <button
                      onClick={() => setShowLog((v) => !v)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${showLog ? 'rotate-180' : ''}`}
                      />
                      {showLog ? 'Hide' : 'Show'} install log
                    </button>
                    {showLog && (
                      <pre className="mt-2 text-[10px] leading-relaxed text-slate-400 bg-[#0a0e1a] rounded-lg p-3 border border-[#1e2d4a] max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                        {installResult.log}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Loading overlay ── */}
            {installing && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 size={32} className="text-blue-400 animate-spin" />
                <p className="text-sm text-slate-300 font-medium">Installing agent…</p>
                <p className="text-xs text-slate-500 text-center">
                  Connecting via SSH and running the install script on the remote server.
                  <br />This may take up to 2 minutes.
                </p>
              </div>
            )}

            {/* ── Forms (hidden while installing or after result) ── */}
            {!installing && !installResult && (
              <>
                {/* ── Script form ── */}
                {connType === 'script' && (
                  <div className="space-y-3">
                    <Field label="Server Name" placeholder="prod-web-01"
                      value={scriptForm.name}
                      onChange={(v) => setScriptForm((f) => ({ ...f, name: v }))} />
                    <Field label="Hostname / IP" placeholder="192.168.1.1 or server.example.com"
                      value={scriptForm.hostname}
                      onChange={(v) => setScriptForm((f) => ({ ...f, hostname: v }))} />
                    <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-3 text-xs text-slate-400 leading-relaxed">
                      After registering, you'll receive an API key. Run the install script on
                      your server and set <code className="text-cyan-300">OPSWATCH_API_KEY</code> to that value.
                    </div>
                  </div>
                )}

                {/* ── SSH Key form ── */}
                {connType === 'ssh' && (
                  <div className="space-y-3">
                    <Field label="Server Name" placeholder="prod-web-01"
                      value={sshForm.name}
                      onChange={(v) => setSshForm((f) => ({ ...f, name: v }))} />
                    <Field label="Host / IP" placeholder="192.168.1.10 or server.example.com"
                      value={sshForm.hostname}
                      onChange={(v) => setSshForm((f) => ({ ...f, hostname: v }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="SSH User" placeholder="root"
                        value={sshForm.sshUser}
                        onChange={(v) => setSshForm((f) => ({ ...f, sshUser: v }))} />
                      <Field label="SSH Port" placeholder="22" type="number"
                        value={sshForm.sshPort}
                        onChange={(v) => setSshForm((f) => ({ ...f, sshPort: v }))} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Private Key</label>
                      <textarea
                        className="input font-mono text-xs resize-none"
                        rows={6}
                        placeholder={'-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'}
                        value={sshForm.privateKey}
                        onChange={(e) => setSshForm((f) => ({ ...f, privateKey: e.target.value }))}
                        spellCheck={false}
                      />
                    </div>
                    <Field
                      label="Key Passphrase (if encrypted)"
                      placeholder="Leave blank if the key has no passphrase"
                      type="password"
                      value={sshForm.passphrase}
                      onChange={(v) => setSshForm((f) => ({ ...f, passphrase: v }))}
                    />
                    <div>
                      <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                        <span>Agent Install Path</span>
                        <span className="text-[10px] text-slate-600">
                          auto-set from SSH user
                        </span>
                      </label>
                      <input
                        className="input font-mono text-xs"
                        placeholder="/home/ubuntu/opswatch"
                        value={sshForm.installPath}
                        onChange={(e) => {
                          sshPathTouched.current = true;
                          setSshForm((f) => ({ ...f, installPath: e.target.value }));
                        }}
                      />
                      <p className="text-[10px] text-slate-600 mt-1">
                        Use a home-directory path (e.g. <code className="text-slate-500">/home/ubuntu/opswatch</code>) when the SSH user is not root.
                      </p>
                    </div>
                    <Field label="OpsWatch API URL (optional)" placeholder="http://your-opswatch-server:4000/api/v1"
                      value={sshForm.apiUrl}
                      onChange={(v) => setSshForm((f) => ({ ...f, apiUrl: v }))} />
                  </div>
                )}

                {/* ── AWS PEM form ── */}
                {connType === 'aws-pem' && (
                  <div className="space-y-3">
                    <Field label="Server Name" placeholder="ec2-prod-01"
                      value={awsForm.name}
                      onChange={(v) => setAwsForm((f) => ({ ...f, name: v }))} />
                    <Field label="Host / IP" placeholder="ec2-3-44-55-66.compute.amazonaws.com"
                      value={awsForm.hostname}
                      onChange={(v) => setAwsForm((f) => ({ ...f, hostname: v }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="SSH User" placeholder="ubuntu"
                        value={awsForm.sshUser}
                        onChange={(v) => setAwsForm((f) => ({ ...f, sshUser: v }))} />
                      <Field label="SSH Port" placeholder="22" type="number"
                        value={awsForm.sshPort}
                        onChange={(v) => setAwsForm((f) => ({ ...f, sshPort: v }))} />
                    </div>

                    {/* PEM file upload */}
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">PEM Key File</label>
                      <div
                        className={`relative flex items-center justify-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                          awsForm.pemFile
                            ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                            : 'border-[#1e2d4a] bg-[#0d1424] hover:border-blue-500/40 hover:bg-blue-500/5 text-slate-500'
                        }`}
                        onClick={() => pemInputRef.current?.click()}
                      >
                        <FileKey size={20} className="shrink-0" />
                        <span className="text-sm font-medium">
                          {awsForm.pemFile ? awsForm.pemFile.name : 'Click to select .pem file'}
                        </span>
                        <input
                          ref={pemInputRef}
                          type="file"
                          accept=".pem,.key,text/plain"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setAwsForm((f) => ({ ...f, pemFile: file }));
                          }}
                        />
                      </div>
                    </div>

                    <Field
                      label="Key Passphrase (if encrypted)"
                      placeholder="Leave blank if the .pem has no passphrase"
                      type="password"
                      value={awsForm.passphrase}
                      onChange={(v) => setAwsForm((f) => ({ ...f, passphrase: v }))}
                    />
                    <div>
                      <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
                        <span>Agent Install Path</span>
                        <span className="text-[10px] text-slate-600">
                          auto-set from SSH user
                        </span>
                      </label>
                      <input
                        className="input font-mono text-xs"
                        placeholder="/home/ubuntu/opswatch"
                        value={awsForm.installPath}
                        onChange={(e) => {
                          awsPathTouched.current = true;
                          setAwsForm((f) => ({ ...f, installPath: e.target.value }));
                        }}
                      />
                      <p className="text-[10px] text-slate-600 mt-1">
                        EC2 instances default to <code className="text-slate-500">/home/ubuntu/opswatch</code> — change if using a different AMI user.
                      </p>
                    </div>
                    <Field label="OpsWatch API URL (optional)" placeholder="http://your-opswatch-server:4000/api/v1"
                      value={awsForm.apiUrl}
                      onChange={(v) => setAwsForm((f) => ({ ...f, apiUrl: v }))} />
                  </div>
                )}
              </>
            )}

            {/* ── Action buttons ── */}
            <div className="flex gap-3 pt-1">
              {!installResult && (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit()}
                  className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {installing ? (
                    <><Loader2 size={14} className="animate-spin" /> Installing…</>
                  ) : connType === 'script' ? (
                    'Register'
                  ) : (
                    'Install Agent'
                  )}
                </button>
              )}
              <button
                onClick={closeModal}
                className="btn-ghost"
                disabled={installing}
              >
                {installResult ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Server grid ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((server) => (
            <div key={server.id} className="card p-5 space-y-4 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      server.status === 'online'
                        ? 'bg-emerald-400 shadow-md shadow-emerald-400/50'
                        : server.status === 'warning'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold text-white text-sm">{server.name}</h3>
                    <p className="text-xs text-slate-500">{server.hostname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/servers/${server.id}`} className="btn-ghost px-2 py-1.5" title="View details">
                    <ExternalLink size={13} />
                  </Link>
                  <button
                    onClick={() => deleteServer(server.id)}
                    className="btn-ghost px-2 py-1.5 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {server.cpuUsage != null && <MetricPill label="CPU" value={server.cpuUsage} />}
                {server.ramUsage != null && <MetricPill label="RAM" value={server.ramUsage} />}
                {server.diskUsage != null && <MetricPill label="Disk" value={server.diskUsage} />}
                {server.cpuUsage == null && (
                  <p className="text-xs text-slate-600 text-center py-2">
                    No metrics yet – waiting for agent…
                  </p>
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

// ─── Reusable field ────────────────────────────────────────────────────────────

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
