import React from 'react';
import { X, Sparkles, CheckCircle2, Shield, Eye, Palette, Type, Layout, Copy, Download } from 'lucide-react';
import { NavigationTab } from '../types';

interface UIShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const UIShowcaseModal: React.FC<UIShowcaseModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const colorTokens = [
    { name: 'Canvas Dark Base', hex: '#080B0A', role: 'Deep obsidian matte canvas, eliminates eye strain in operations' },
    { name: 'Surface Panel', hex: '#0B120F', role: 'Primary card background, mathematically ≤6% brightness delta' },
    { name: 'Tactical Border', hex: '#162720', role: 'Subtle high-precision divider line, prevents visual clutter' },
    { name: 'Emerald Core Accent', hex: '#10B981', role: 'Tactical primary indicator, high-contrast WCAG AAA legibility' },
    { name: 'Mint Signal Peak', hex: '#34D399', role: 'Active waveform peaks and carrier lock indicators' },
    { name: 'Status Warning Amber', hex: '#F59E0B', role: 'In-progress execution state and threshold alerts' },
  ];

  return (
    <div 
      id="modal-corporate-ui-showcase"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-[#0A100E] border border-[#1B3026] rounded-2xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-[#111A16] hover:bg-[#182620] text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 border-b border-[#16251E] pb-4">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EXECUTIVE UI ARCHITECTURE SPECIFICATION</span>
          </div>
          <h2 className="text-2xl font-bold font-display text-white tracking-tight uppercase">
            SpectraSense Corporate UI Enhancements
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Designed specifically for high-end corporate and defense-intelligence audiences, 
            balancing tactical precision, optical clarity, and intuitive navigation.
          </p>
        </div>

        {/* 3 Pillars of the Corporate Redesign */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0C1411] border border-[#172821] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Type className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wide">
              1. Clean Typography Hierarchy
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Paired <span className="text-emerald-400 font-semibold">Space Grotesk</span> for bold display titles, <span className="text-emerald-400 font-semibold">Plus Jakarta Sans</span> for effortless body readability, and <span className="text-emerald-400 font-semibold">JetBrains Mono</span> for numerical telemetry & hexstreams.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0C1411] border border-[#172821] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Layout className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wide">
              2. Intuitive Navigation
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Global <span className="text-emerald-400 font-mono">Ctrl+K</span> command palette, clear active state indicators with micro-radii, live UTC rig clock, and instant signal preset switching for seamless boardroom presentations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0C1411] border border-[#172821] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Palette className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-mono font-bold uppercase text-white tracking-wide">
              3. Anti-Fatigue Dark Theme
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Replaced harsh 100% blacks with refined obsidian carbon tones (<span className="text-emerald-400 font-mono">#080B0A</span>), restrained neon emerald highlights, and matte borders to ensure 24/7 tactical monitoring without eye strain.
            </p>
          </div>
        </div>

        {/* Color Palette Tokens */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider">
              ENTERPRISE COLOR SYSTEM TOKENS
            </h3>
            <span className="text-[10px] font-mono text-emerald-400">WCAG AA COMPLIANT</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colorTokens.map((token) => (
              <div 
                key={token.hex}
                className="p-3 rounded-lg bg-[#0C1411] border border-[#172821] flex flex-col justify-between"
              >
                <div className="flex items-center space-x-2.5 mb-2">
                  <div 
                    className="w-5 h-5 rounded border border-white/20 shrink-0 shadow-sm"
                    style={{ backgroundColor: token.hex }}
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{token.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400">{token.hex}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {token.role}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick View Navigation Links */}
        <div className="pt-4 border-t border-[#16251E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">QUICK PREVIEW:</span>
            <button
              onClick={() => { onNavigateTab('dashboard'); onClose(); }}
              className="px-3 py-1 rounded bg-[#121F1A] hover:bg-[#182A23] border border-[#1E352B] text-xs font-mono text-emerald-300"
            >
              Dashboard View
            </button>
            <button
              onClick={() => { onNavigateTab('ingest'); onClose(); }}
              className="px-3 py-1 rounded bg-[#121F1A] hover:bg-[#182A23] border border-[#1E352B] text-xs font-mono text-emerald-300"
            >
              Ingest & DAG View
            </button>
            <button
              onClick={() => { onNavigateTab('reports'); onClose(); }}
              className="px-3 py-1 rounded bg-[#121F1A] hover:bg-[#182A23] border border-[#1E352B] text-xs font-mono text-emerald-300"
            >
              Executive Reports
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono transition-colors"
          >
            Continue to Live App
          </button>
        </div>
      </div>
    </div>
  );
};
