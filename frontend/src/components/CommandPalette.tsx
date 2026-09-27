import React, { useState, useEffect } from 'react';
import { Search, Radio, Workflow, FileText, Activity, X, ArrowRight } from 'lucide-react';
import { NavigationTab, SignalSample } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  presetSignals: SignalSample[];
  onSelectSignal: (sig: SignalSample) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  presetSignals,
  onSelectSignal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredSignals = presetSignals.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.modulation.toLowerCase().includes(query.toLowerCase()) ||
    s.frequency.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div 
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="command-palette-modal"
        className="w-full max-w-xl bg-[#0C1310] border border-[#1C3227] rounded-2xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#182C22]">
          <Search className="w-5 h-5 text-emerald-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signals, demodulations, navigation, or DAG steps..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Nav Options */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 block mb-1">
              NAVIGATION SHORTCUTS
            </span>
            <div className="space-y-1">
              {[
                { tab: 'dashboard' as NavigationTab, label: 'Dashboard & Spectrum Visualizer', icon: Activity },
                { tab: 'ingest' as NavigationTab, label: 'Ingest Capture & DAG Execution', icon: Workflow },
                { tab: 'visualizations' as NavigationTab, label: 'RF Waterfall & PSD Spectrogram', icon: Radio },
                { tab: 'reports' as NavigationTab, label: 'Intelligence Dossier & Reports', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tab}
                    onClick={() => {
                      onNavigateTab(item.tab);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-[#121F1A] hover:text-emerald-300 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 text-emerald-400" />
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Captured Signals */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 block mb-1">
              TACTICAL SIGNALS ({filteredSignals.length})
            </span>
            <div className="space-y-1">
              {filteredSignals.map((sig) => (
                <button
                  key={sig.id}
                  onClick={() => {
                    onSelectSignal(sig);
                    onNavigateTab('dashboard');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs hover:bg-[#121F1A] text-left transition-colors"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center space-x-2">
                      <span>{sig.name}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-[#172720] text-emerald-400">
                        {sig.modulation}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {sig.frequency} • {sig.category}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400/80">Select & Inspect</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#090F0C] border-t border-[#182C22] flex justify-between text-[10px] font-mono text-slate-500">
          <span>Use ESC to close</span>
          <span>SpectraSense Quick Rig Navigator</span>
        </div>
      </div>
    </div>
  );
};
