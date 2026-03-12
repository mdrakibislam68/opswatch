'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { domainsApi } from '@/lib/api';
import {
  ArrowLeft,
  Globe,
  Server,
  Box,
  Shield,
  ShieldOff,
  FileText,
  Hash,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [domain, setDomain] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    domainsApi
      .get(id)
      .then(setDomain)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-fadeIn">
        <div className="h-8 w-48 rounded-lg skeleton" />
        <div className="h-64 rounded-xl skeleton" />
        <div className="h-96 rounded-xl skeleton" />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="p-6 text-center py-24">
        <Globe size={48} className="mx-auto mb-3 text-slate-700" />
        <p className="text-slate-400 font-medium">Domain not found</p>
        <button onClick={() => router.push('/domains')} className="btn-ghost mt-4">
          Back to Domains
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/domains')}
          className="btn-ghost px-2 py-2"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-blue-400" />
            <h1 className="text-2xl font-bold text-white">{domain.domain}</h1>
            {domain.ssl ? (
              <span className="badge-online flex items-center gap-1">
                <Shield size={11} /> SSL
              </span>
            ) : (
              <span className="badge-offline flex items-center gap-1">
                <ShieldOff size={11} /> No SSL
              </span>
            )}
            <span
              className={
                domain.status === 'active' ? 'badge-online' : 'badge-warning'
              }
            >
              {domain.status}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Proxying to {domain.proxyPass || '–'}
          </p>
        </div>
        {domain.ssl && (
          <a
            href={`https://${domain.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs gap-1"
          >
            <ExternalLink size={13} /> Visit
          </a>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Server size={13} /> Server
          </div>
          {domain.server ? (
            <Link
              href={`/servers/${domain.server.id}`}
              className="text-sm text-white hover:text-blue-400 transition-colors font-medium"
            >
              {domain.server.name}
            </Link>
          ) : (
            <p className="text-sm text-slate-400">{domain.serverId?.slice(0, 8)}</p>
          )}
          <p className="text-xs text-slate-600">
            {domain.server?.hostname || '–'}
          </p>
        </div>

        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Hash size={13} /> Port
          </div>
          <p className="text-sm text-cyan-400 font-mono font-medium">
            {domain.port || '–'}
          </p>
          <p className="text-xs text-slate-600 font-mono truncate">
            {domain.proxyPass || '–'}
          </p>
        </div>

        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Box size={13} /> Container
          </div>
          <p className="text-sm text-white font-mono font-medium">
            {domain.containerName || 'Not matched'}
          </p>
          <p className="text-xs text-slate-600 font-mono">
            {domain.containerId || '–'}
          </p>
        </div>

        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Shield size={13} /> SSL Certificate
          </div>
          {domain.ssl ? (
            <p className="text-sm text-emerald-400 font-medium">Enabled</p>
          ) : (
            <p className="text-sm text-red-400 font-medium">Not configured</p>
          )}
          <p className="text-xs text-slate-600">
            {domain.ssl ? 'HTTPS active' : 'HTTP only'}
          </p>
        </div>
      </div>

      {/* Nginx config */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#1e2d4a]">
          <FileText size={14} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">
            Nginx Configuration
          </span>
          <span className="text-xs text-slate-600 ml-auto font-mono">
            {domain.configFile || 'unknown'}
          </span>
        </div>
        <div className="p-5 overflow-x-auto">
          {domain.configContent ? (
            <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
              {domain.configContent}
            </pre>
          ) : (
            <p className="text-sm text-slate-600 text-center py-8">
              No configuration content available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
