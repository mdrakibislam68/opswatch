'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { containersApi } from '@/lib/api';
import { Terminal, Download, Copy, Play, Square, RefreshCw, ChevronLeft, Check } from 'lucide-react';

const TAIL_OPTIONS = [50, 100, 200, 500, 1000];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function parseTimestamp(line: string): { ts: string; msg: string } {
  // Docker format: 2026-03-10T05:24:32.123456789Z some log message
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s(.*)$/);
  if (match) {
    const d = new Date(match[1]);
    const ts = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      + '.' + d.getMilliseconds().toString().padStart(3, '0');
    return { ts, msg: match[2] };
  }
  return { ts: '', msg: line };
}

function LogLine({ line, index }: { line: string; index: number }) {
  const { ts, msg } = parseTimestamp(line);
  const isErr = msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fatal') || msg.toLowerCase().includes('panic');
  const isWarn = msg.toLowerCase().includes('warn') || msg.toLowerCase().includes('warning');

  return (
    <div className={`flex gap-3 font-mono text-xs hover:bg-white/5 px-2 py-0.5 rounded leading-5 group ${isErr ? 'text-red-400' : isWarn ? 'text-yellow-400' : 'text-slate-300'}`}>
      <span className="text-slate-600 select-none shrink-0 w-8 text-right">{index + 1}</span>
      {ts && <span className="text-slate-500 shrink-0">{ts}</span>}
      <span className="break-all whitespace-pre-wrap">{msg || line}</span>
    </div>
  );
}

export default function ContainerLogsPage() {
  const params = useParams();
  const router = useRouter();
  const dockerId = params.id as string;

  const [lines, setLines] = useState<string[]>([]);
  const [containerName, setContainerName] = useState(dockerId);
  const [tail, setTail] = useState(100);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch static logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await containersApi.logs(dockerId, tail, true);
      setLines(data.lines || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [dockerId, tail]);

  // Load container name
  useEffect(() => {
    containersApi.get(dockerId).then((c) => setContainerName(c?.name || dockerId)).catch(() => {});
  }, [dockerId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto scroll
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, autoScroll]);

  // Scroll detection — disable auto-scroll if user scrolls up
  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
    setAutoScroll(atBottom);
  };

  // Start SSE stream
  const startStream = useCallback(() => {
    if (eventSourceRef.current) return;
    setStreaming(true);
    setLines([]);
    setError(null);
    setAutoScroll(true);

    const token = typeof window !== 'undefined' ? localStorage.getItem('opswatch_token') : '';
    // We include token as a query param since EventSource doesn't support custom headers
    const url = `${API_URL}/containers/${dockerId}/logs/stream?tail=${tail}&token=${token}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.done) {
          stopStream();
          return;
        }
        if (data.error) {
          setError(data.error);
          stopStream();
          return;
        }
        if (data.line) {
          setLines((prev) => [...prev, data.line]);
        }
      } catch {}
    };

    es.onerror = () => {
      stopStream();
    };
  }, [dockerId, tail]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${containerName}-logs.txt`;
    a.click();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push('/containers')}
          className="btn-ghost py-1.5 px-2 text-slate-400 hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
        <Terminal size={18} className="text-emerald-400" />
        <div>
          <h1 className="text-lg font-bold text-white font-mono">{containerName}</h1>
          <p className="text-xs text-slate-500">{lines.length} lines loaded</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Tail selector */}
          <select
            className="input py-1.5 text-xs h-auto"
            value={tail}
            onChange={(e) => { setTail(Number(e.target.value)); if (streaming) stopStream(); }}
            disabled={streaming}
          >
            {TAIL_OPTIONS.map((t) => (
              <option key={t} value={t}>Last {t} lines</option>
            ))}
          </select>

          {/* Refresh */}
          {!streaming && (
            <button
              onClick={fetchLogs}
              className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}

          {/* Live toggle */}
          {streaming ? (
            <button onClick={stopStream} className="btn-ghost py-1.5 px-3 text-xs gap-1.5 text-yellow-400 hover:text-yellow-300 border border-yellow-500/30">
              <Square size={12} className="fill-yellow-400" />
              Stop Live
            </button>
          ) : (
            <button onClick={startStream} className="btn-ghost py-1.5 px-3 text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30">
              <Play size={12} className="fill-emerald-400" />
              Live Stream
            </button>
          )}

          {/* Copy */}
          <button onClick={handleCopy} className="btn-ghost py-1.5 px-3 text-xs gap-1.5" disabled={lines.length === 0}>
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {/* Download */}
          <button onClick={handleDownload} className="btn-ghost py-1.5 px-3 text-xs gap-1.5" disabled={lines.length === 0}>
            <Download size={13} />
            Download
          </button>
        </div>
      </div>

      {/* Terminal viewer */}
      <div className="flex-1 rounded-xl bg-[#0d1117] border border-[#1e2d4a] overflow-hidden flex flex-col">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1e2d4a] bg-[#161b22]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-slate-500 font-mono ml-2">{containerName} — logs</span>
          {streaming && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {/* Log content */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto py-2 px-1"
        >
          {loading && !streaming && (
            <div className="flex items-center gap-2 text-slate-500 text-xs px-4 py-8 justify-center">
              <RefreshCw size={14} className="animate-spin" />
              Loading logs...
            </div>
          )}

          {error && (
            <div className="text-red-400 text-xs font-mono px-4 py-8 text-center">
              ⚠ {error}
            </div>
          )}

          {!loading && !error && lines.length === 0 && (
            <div className="text-slate-600 text-xs font-mono px-4 py-8 text-center">
              No log output found for this container
            </div>
          )}

          {lines.map((line, i) => (
            <LogLine key={i} line={line} index={i} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="border-t border-[#1e2d4a] px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-mono">{lines.length} lines</span>
          {!autoScroll && lines.length > 0 && (
            <button
              onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono"
            >
              ↓ Scroll to bottom
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
