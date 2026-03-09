'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, Box, Activity, Bell, Settings,
  LogOut, Zap, Shield, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/servers', label: 'Servers', icon: Server },
  { href: '/containers', label: 'Containers', icon: Box },
  { href: '/uptime', label: 'Uptime', icon: Activity },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[#1e2d4a] bg-[#0f1629]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1e2d4a]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">OpsWatch</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">DevOps Monitor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-[#1a2236] hover:text-slate-200'
              )}
            >
              <item.icon size={17} className={cn(isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
              {item.label}
              {isActive && <ChevronRight size={13} className="ml-auto text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[#1e2d4a] p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
          </div>
          <Shield size={13} className="text-blue-400 shrink-0" />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
