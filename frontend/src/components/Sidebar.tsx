import React from 'react';
import { 
  LayoutGrid, 
  UploadCloud, 
  LineChart, 
  Activity, 
  Workflow, 
  FileText, 
  Settings, 
  Sparkles,
  Radio,
  ShieldAlert
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenDesignSystem: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenDesignSystem,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'ingest', label: 'Ingest', icon: UploadCloud },
    { id: 'analysis', label: 'Analysis', icon: LineChart },
    { id: 'visualizations', label: 'Visualizations', icon: Activity },
    { id: 'dag-pipeline', label: 'DAG Pipeline', icon: Workflow },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      id="sidebar-navigation"
      className="w-64 bg-[#0A0E0C] border-r border-[#15231D] flex flex-col justify-between shrink-0 select-none z-20 min-h-screen"
    >
      {/* Brand Header */}
      <div>
        <div className="p-6 pb-5 border-b border-[#15231D]/80">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              {/* Tactical Waveform Icon */}
              <svg className="w-5 h-5 text-emerald-400 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h3l2-5 3 10 3-7 2 4 2-2h5" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-bold text-lg tracking-tight text-white">
                  Spectra<span className="text-emerald-400">Sense</span>
                </span>
              </div>
              <p className="text-[10px] tracking-wider uppercase text-emerald-500/80 font-mono font-medium">
                TACTICAL RF INTELLIGENCE
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#101815]/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.id === 'ingest' && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-mono">
                    RAW IQ
                  </span>
                )}
              </button>
            );
          })}

          {/* Corporate UI Design System Showcase Button */}
          <div className="pt-3 mt-3 border-t border-[#15231D]/80">
            <button
              id="btn-design-system-trigger"
              onClick={onOpenDesignSystem}
              className="w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-lg text-xs font-medium text-emerald-400/90 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="text-left leading-tight">
                <span className="block font-semibold">Corporate UI Guide</span>
                <span className="text-[10px] text-emerald-500/70">Theme Tokens & Design Specs</span>
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 m-3 rounded-lg bg-[#0C120F] border border-[#16251E] text-xs">
        <div className="flex items-center space-x-2 mb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-[11px] font-semibold tracking-wide text-emerald-400">
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-[#15231D]">
          <span>SYSTEM STATUS</span>
          <span className="text-slate-400 font-medium">ONLINE</span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-600 font-mono mt-1">
          <span>v1.0.0</span>
          <span>SIH 26147</span>
        </div>
      </div>
    </aside>
  );
};
