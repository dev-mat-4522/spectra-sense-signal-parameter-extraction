import React, { useState, useEffect } from 'react';
import { Search, Radio, ChevronDown, Check, Download, Zap, RefreshCw } from 'lucide-react';
import { SignalSample } from '../types';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  activeSignal: SignalSample;
  presetSignals: SignalSample[];
  onSelectSignal: (sig: SignalSample) => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  activeSignal,
  presetSignals,
  onSelectSignal,
  onRefreshData,
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [isPresetOpen, setIsPresetOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: Fri, Sep 11, 2026 14:06:03
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const day = days[now.getDay()];
      const month = months[now.getMonth()];
      const date = now.getDate();
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      setTimeString(`${day}, ${month} ${date}, ${year}  ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header 
      id="header-bar"
      className="h-16 bg-[#080D0B] border-b border-[#14231C] px-6 flex items-center justify-between z-10 shrink-0 select-none"
    >
      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl">
        <button
          id="btn-global-search"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 bg-[#0E1613] hover:bg-[#121C18] border border-[#192A22] hover:border-emerald-500/40 rounded-lg text-sm text-slate-400 transition-all text-left group"
        >
          <div className="flex items-center space-x-2.5">
            <Search className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span className="text-slate-400 text-xs sm:text-sm">Search signals, files, or past analyses...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-mono bg-[#16241E] text-slate-400 rounded border border-[#23382F]">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Center/Right Status Indicators */}
      <div className="flex items-center space-x-5 ml-4">
        {/* Active Signal Dropdown Picker */}
        <div className="relative">
          <button
            id="btn-active-signal-selector"
            onClick={() => setIsPresetOpen(!isPresetOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0F1814] border border-[#1B2D24] text-xs font-mono text-emerald-300 hover:border-emerald-500/50 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline font-semibold">{activeSignal.name}</span>
            <span className="md:hidden font-semibold">{activeSignal.modulation}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPresetOpen && (
            <div 
              id="dropdown-signal-presets"
              className="absolute right-0 mt-2 w-80 bg-[#0E1513] border border-[#1F3329] rounded-xl shadow-2xl p-2 z-50 font-sans"
            >
              <div className="px-3 py-2 text-[11px] font-mono text-slate-400 border-b border-[#1A2C23]">
                TACTICAL RF CAPTURES ({presetSignals.length})
              </div>
              <div className="space-y-1 mt-1">
                {presetSignals.map((sig) => (
                  <button
                    key={sig.id}
                    onClick={() => {
                      onSelectSignal(sig);
                      setIsPresetOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      sig.id === activeSignal.id
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-300 hover:bg-[#131F1A]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center space-x-1.5">
                        <span>{sig.name}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-[#172620] text-emerald-400">
                          {sig.modulation}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {sig.frequency} • SNR {sig.snrDb} dB
                      </div>
                    </div>
                    {sig.id === activeSignal.id && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Online Badge */}
        <div className="hidden lg:flex items-center space-x-2.5 px-3 py-1.5 bg-[#0B1310] border border-[#182A21] rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="text-left leading-tight">
            <span className="block text-[11px] font-bold text-white tracking-wide">
              System Online
            </span>
            <span className="text-[10px] text-emerald-500/90 font-mono">
              All modules operational
            </span>
          </div>
        </div>

        {/* Live Date / Time Clock */}
        <div className="hidden sm:block text-right">
          <div className="text-xs font-mono font-semibold text-slate-300 tracking-tight">
            {timeString || 'Fri, Sep 11, 2026 14:06:03'}
          </div>
          <div className="text-[10px] font-mono text-emerald-500/80">
            UTC LOCAL RIG SYNCHRONIZED
          </div>
        </div>
      </div>
    </header>
  );
};
