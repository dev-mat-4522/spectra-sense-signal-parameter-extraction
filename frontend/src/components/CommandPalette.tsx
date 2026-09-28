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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="command-palette-modal"
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200">
          <Search className="w-5 h-5 text-blue-600 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signals, demodulations, navigation, or DAG steps..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
          />
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-700">
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
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4 text-blue-600" />
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
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-xs hover:bg-slate-100 text-left transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center space-x-2">
                      <span>{sig.name}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-blue-600 border border-slate-200">
                        {sig.modulation}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {sig.frequency} • {sig.category}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-blue-600/80">Select & Inspect</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-between text-[10px] font-mono text-slate-500">
          <span>Use ESC to close</span>
          <span>SpectraSense Quick Rig Navigator</span>
        </div>
      </div>
    </div>
  );
};
