import React, { useState } from 'react';
import { ServerStatus } from '../types';
import { Wifi, WifiOff, Copy, Check, Server, Users, Activity, Clock } from 'lucide-react';

interface Props {
  isConnected: boolean;
  serverStatus: ServerStatus | null;
  pingMs: number | null;
  activeTab: 'arena' | 'dual' | 'packets' | 'code';
  setActiveTab: (tab: 'arena' | 'dual' | 'packets' | 'code') => void;
}

export const ServerHeader: React.FC<Props> = ({
  isConnected,
  serverStatus,
  pingMs,
  activeTab,
  setActiveTab,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const getWsUrl = () => {
    if (typeof window === 'undefined') return 'ws://localhost:3000';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  };

  const copyWsUrl = () => {
    navigator.clipboard.writeText(getWsUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatUptime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const hours = Math.floor(mins / 60);
    if (hours > 0) return `${hours} ساعت و ${mins % 60} دقیقه`;
    if (mins > 0) return `${mins} دقیقه و ${sec % 60} ثانیه`;
    return `${sec} ثانیه`;
  };

  return (
    <header className="border-b border-amber-900/30 bg-gradient-to-b from-[#14161f] to-[#0d0e14] px-4 py-4 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top bar: Title & Connection Status */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-600/20 to-amber-950/40 shadow-lg shadow-amber-950/40">
              <span className="text-2xl font-black text-amber-400 select-none">ک</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl font-['Vazirmatn']">
                  سرور بازی کارزار شاهنامه
                </h1>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 font-mono">
                  KARZAR WS v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Node.js WebSocket Multiplayer Server برای بازی رومیزی و نبرد کارزار
              </p>
            </div>
          </div>

          {/* Connection status badge & WS URL */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all ${
                isConnected
                  ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>متصل به وب‌سوکت</span>
                  {pingMs !== null && (
                    <span className="text-[11px] font-mono text-emerald-400/80">({pingMs}ms)</span>
                  )}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>قطع ارتباط / در حال تلاش...</span>
                </>
              )}
            </div>

            <button
              onClick={copyWsUrl}
              className="group flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-500/50 hover:bg-slate-800 transition-colors"
              title="کپی آدرس وب‌سوکت برای استفاده در کلاینت یونیتی، فلاتر یا وب"
            >
              <span className="font-mono text-[11px] text-slate-300 dir-ltr select-all">
                {getWsUrl()}
              </span>
              {copiedUrl ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#161823]/70 px-3 py-2.5">
            <Server className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-400">وضعیت سرور</div>
              <div className="text-xs font-semibold text-slate-200">
                {serverStatus?.status === 'online' ? 'فعال و آماده نبرد' : 'در حال راه‌اندازی'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#161823]/70 px-3 py-2.5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <div>
              <div className="text-[11px] text-slate-400">اتاق‌های فعال (Rooms)</div>
              <div className="text-xs font-bold text-slate-200 font-mono">
                {serverStatus?.activeRooms ?? 0} اتاق
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#161823]/70 px-3 py-2.5">
            <Users className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-[11px] text-slate-400">اتصال کلاینت‌ها</div>
              <div className="text-xs font-bold text-slate-200 font-mono">
                {serverStatus?.connectedClients ?? (isConnected ? 1 : 0)} کاربر
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#161823]/70 px-3 py-2.5">
            <Clock className="h-4 w-4 text-indigo-400" />
            <div>
              <div className="text-[11px] text-slate-400">مدت فعالیت (Uptime)</div>
              <div className="text-xs font-semibold text-slate-200">
                {serverStatus ? formatUptime(serverStatus.uptimeSeconds) : '0s'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-5 flex gap-1 border-b border-slate-800/80 pb-px">
          <button
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'arena'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>⚔️ میدان نبرد و تست آنلاین</span>
          </button>

          <button
            onClick={() => setActiveTab('dual')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'dual'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>👥 شبیه‌ساز همزمان دو بازیکن (Split Screen)</span>
          </button>

          <button
            onClick={() => setActiveTab('packets')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'packets'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>📡 مانیتور پکت‌های وب‌سوکت</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'code'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>💻 کد سرور و نحوه اتصال کلاینت‌ها</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
