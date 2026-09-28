import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  Binary, 
  Layers, 
  CheckCircle2, 
  Zap
} from 'lucide-react';
import { SignalSample, WaveformChannel, NavigationTab, BackendResult } from '../types';
import { TimeDomainWaveformCanvas, ConstellationDiagramCanvas } from './TacticalVisualizers';

interface DashboardViewProps {
  activeSignal: SignalSample;
  onNavigate: (tab: NavigationTab) => void;
  onRunAnalysis: () => void;
  analysisResult?: BackendResult | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeSignal,
  onNavigate,
  onRunAnalysis, 
  analysisResult,
}) => {
  const [waveformChannel, setWaveformChannel] = useState<WaveformChannel>('combined');

  return (
    <div id="dashboard-view-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Hero Banner Section */}
      <div 
        id="hero-banner-section"
        className="rounded-2xl bg-gradient-to-r from-white via-slate-50 to-white border border-slate-200 p-6 lg:p-8 relative overflow-hidden shadow-sm"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-none">
              Welcome to <span className="text-blue-500">SpectraSense</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl font-normal">
              Upload a signal file and let our AI-powered pipeline analyze, decode and visualize the RF spectrum.
            </p>

            {/* Quick action triggers */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                id="btn-hero-run-pipeline"
                onClick={() => onNavigate('ingest')}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Upload File</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div id="metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Signal Detected */}
        <div 
          id="metric-signal-detected"
          className="rounded-xl bg-white border border-slate-200 hover:border-blue-300 p-4 transition-all duration-200 shadow-sm group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-blue-600 font-semibold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>SIGNAL DETECTED</span>
            </span>
            <Radio className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="font-display font-bold text-2xl text-slate-900 tracking-tight mt-1">
            {analysisResult ? analysisResult.amc.modulation : "—"}
          </div>
          <div className="text-[11px] font-mono text-blue-600/90 mt-1 flex items-center space-x-1">
            <span>{analysisResult ? (analysisResult.amc.confidence * 100).toFixed(1) : "0.0"}%</span>
            <span className="text-slate-500">confidence</span>
          </div>
        </div>

        {/* Metric 2: Sampling Rate */}
        <div 
          id="metric-sampling-rate"
          className="rounded-xl bg-white border border-slate-200 hover:border-blue-300 p-4 transition-all duration-200 shadow-sm group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 font-semibold flex items-center space-x-1.5">
              <Activity className="w-3 h-3 text-blue-500" />
              <span>SAMPLING RATE</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-slate-900 tracking-tight mt-1">
            {analysisResult ? analysisResult.params.sampling_rate_hz.toLocaleString() : "—"}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            {analysisResult ? analysisResult.params.symbol_rate_hz.toLocaleString() : "—"} baud
          </div>
        </div>

        {/* Metric 3: Bits Extracted */}
        <div 
          id="metric-bits-extracted"
          className="rounded-xl bg-white border border-slate-200 hover:border-blue-300 p-4 transition-all duration-200 shadow-sm group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 font-semibold flex items-center space-x-1.5">
              <Binary className="w-3 h-3 text-blue-500" />
              <span>BITS EXTRACTED</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-slate-900 tracking-tight mt-1">
            {analysisResult ? (analysisResult.correlation?.payload_len_bits || analysisResult.demod?.bits || 0).toLocaleString() : "—"}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            From IQ data
          </div>
        </div>

        {/* Metric 4: Sync Correlation */}
        <div 
          id="metric-sync-correlation"
          className="rounded-xl bg-white border border-slate-200 hover:border-blue-300 p-4 transition-all duration-200 shadow-sm group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 font-semibold flex items-center space-x-1.5">
              <Layers className="w-3 h-3 text-blue-500" />
              <span>SYNC HITS</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-slate-900 tracking-tight mt-1">
            {analysisResult ? analysisResult.correlation?.num_hits || 0 : "—"}
          </div>
          <div className="text-[11px] font-mono text-blue-500/90 mt-1 truncate" title={analysisResult?.correlation?.framing?.sync || "N/A"}>
            {analysisResult?.correlation?.framing?.sync || "N/A"}
          </div>
        </div>

        {/* Metric 5: Pipeline Status */}
        <div 
          id="metric-pipeline-status"
          className="rounded-xl bg-white border border-slate-200 hover:border-blue-300 p-4 transition-all duration-200 shadow-sm group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500 font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3 h-3 text-blue-500" />
              <span>PIPELINE STATUS</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-blue-500 tracking-tight mt-1">
            {analysisResult ? (analysisResult.status || "COMPLETE") : "PENDING"}
          </div>
          {/* 100% Progress Bar */}
          <div className="mt-2.5 flex items-center space-x-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full bg-blue-500 rounded-full w-full ${analysisResult ? 'shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'w-0'}`}></div>
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-500">{analysisResult ? "100%" : "0%"}</span>
          </div>
        </div>
      </div>

      {/* Dual Waveform & Constellation Interactive Canvas Section */}
      <div id="visualizers-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Time Domain Waveform (2 Columns on large screens) */}
        <div className="lg:col-span-2">
          <TimeDomainWaveformCanvas
            channel={waveformChannel}
            onChangeChannel={setWaveformChannel}
            modulation={activeSignal.modulation} analysisResult={analysisResult}
          />
        </div>

        {/* Constellation Diagram (1 Column) */}
        <div className="lg:col-span-1">
          <ConstellationDiagramCanvas
            modulation={analysisResult?.amc.modulation || activeSignal.modulation}
            analysisResult={analysisResult}
          />
        </div>
      </div>
    </div>
  );
};
