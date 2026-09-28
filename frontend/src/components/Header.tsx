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
      className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0 select-none"
    >
      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl">
        <button
          id="btn-global-search"
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-blue-300 rounded-lg text-sm text-slate-500 transition-all text-left group"
        >
          <div className="flex items-center space-x-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-slate-500 text-xs sm:text-sm">Search signals, files, or past analyses...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-mono bg-white text-slate-400 rounded border border-slate-200">
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
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline font-semibold">{activeSignal.name}</span>
            <span className="md:hidden font-semibold">{activeSignal.modulation}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isPresetOpen && (
            <div 
              id="dropdown-signal-presets"
              className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 font-sans"
            >
              <div className="px-3 py-2 text-[11px] font-mono text-slate-500 border-b border-slate-100">
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
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center space-x-1.5">
                        <span>{sig.name}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-blue-600">
                          {sig.modulation}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {sig.frequency} • SNR {sig.snrDb} dB
                      </div>
                    </div>
                    {sig.id === activeSignal.id && (
                      <Check className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Online Badge */}
        <div className="hidden lg:flex items-center space-x-2.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <div className="text-left leading-tight">
            <span className="block text-[11px] font-bold text-slate-800 tracking-wide">
              System Online
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              All modules operational
            </span>
          </div>
        </div>

        {/* Live Date / Time Clock */}
        <div className="hidden sm:block text-right">
          <div className="text-xs font-mono font-semibold text-slate-800 tracking-tight">
            {timeString || 'Fri, Sep 11, 2026 14:06:03'}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            UTC
          </div>
        </div>
      </div>
    </header>
  );
};
