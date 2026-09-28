import React from 'react';
import { 
  LayoutGrid, 
  UploadCloud, 
  LineChart, 
  Activity, 
  Workflow, 
  FileText, 
  Settings,
  Radio
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'ingest', label: 'Upload & Analyze', icon: UploadCloud },
    { id: 'analysis', label: 'Signal Analysis', icon: LineChart },
    { id: 'visualizations', label: 'Modulation Detection', icon: Activity },
    { id: 'dag-pipeline', label: 'Protocol Decoder', icon: Workflow },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside 
      id="sidebar-navigation"
      className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-20 min-h-screen"
    >
      {/* Brand Header */}
      <div>
        <div className="p-6 pb-5 border-b border-slate-800">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 text-white shadow-md">
              {/* Tactical Waveform Icon */}
              <svg className="w-5 h-5 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h3l2-5 3 10 3-7 2 4 2-2h5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-bold text-lg tracking-tight text-white">
                  Spectra<span className="text-blue-400">Sense</span>
                </span>
              </div>
              <p className="text-[10px] tracking-wider uppercase text-slate-400 font-mono font-medium">
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
                    ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-4 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex flex-col space-y-1 text-center">
          <span className="text-xs text-slate-500 font-medium">SpectraSense v1.0.0</span>
          
        </div>
      </div>
    </aside>
  );
};
