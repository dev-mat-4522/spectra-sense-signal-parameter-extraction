import React, { useState } from 'react';
import { 
  Radio, 
  Activity, 
  Binary, 
  Layers, 
  CheckCircle2, 
  ArrowUpRight, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { SignalSample, WaveformChannel, NavigationTab } from '../types';
import { LiveSpectrumAudioVisualizer } from './LiveSpectrumAudioVisualizer';
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
}) => {
  const [waveformChannel, setWaveformChannel] = useState<WaveformChannel>('combined');

  return (
    <div id="dashboard-view-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Hero Banner Section */}
      <div 
        id="hero-banner-section"
        className="rounded-2xl bg-gradient-to-r from-[#0C1411] via-[#0E1713] to-[#0A100E] border border-[#182C23] p-6 lg:p-8 relative overflow-hidden shadow-2xl"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>RF INTEL SURVEILLANCE MATRIX</span>
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight uppercase leading-none">
              RADIO SPECTRUM <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                HIDES STORIES.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl font-normal">
              Tactical RF signal intelligence, decoded into actionable insight. 
              Upload raw IQ or WAV captures for automated modulation classification and payload extraction.
            </p>

            {/* Quick action triggers */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                id="btn-hero-run-pipeline"
                onClick={() => onNavigate('ingest')}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all shadow-[0_0_16px_rgba(16,185,129,0.3)] hover:shadow-[0_0_24px_rgba(16,185,129,0.5)] cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Open Ingestion & DAG</span>
              </button>

              <button
                id="btn-hero-view-reports"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#111C17] hover:bg-[#16251F] border border-[#20372C] text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <span>Generate Intelligence Brief</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Top Right Live Signal Spectrum Visualizer */}
          <div className="lg:self-center bg-[#09100D]/80 border border-[#16271F] p-4 rounded-xl backdrop-blur-sm">
            <LiveSpectrumAudioVisualizer barCount={26} />
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 pt-2 border-t border-[#16251E]">
              <span>{analysisResult ? (analysisResult.params.cfo_hz > 0 ? `CFO: +${analysisResult.params.cfo_hz.toFixed(1)} Hz` : `CFO: ${analysisResult.params.cfo_hz.toFixed(1)} Hz`) : `CENTER: ${activeSignal.frequency.split(' ')[0]}`}</span>
              <span className="text-emerald-400 font-bold">BW: {analysisResult ? `${(analysisResult.params.bandwidth_hz / 1000).toFixed(1)} kHz` : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards (Matching Screenshot) */}
      <div id="metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Signal Detected */}
        <div 
          id="metric-signal-detected"
          className="rounded-xl bg-[#0B120F] border border-[#172720] hover:border-emerald-500/40 p-4 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-500/90 font-semibold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>SIGNAL DETECTED</span>
            </span>
            <Radio className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="font-display font-bold text-2xl text-white tracking-tight mt-1">
            {analysisResult ? analysisResult.amc.modulation : "—"}
          </div>
          <div className="text-[11px] font-mono text-emerald-400/90 mt-1 flex items-center space-x-1">
            <span>{analysisResult ? (analysisResult.amc.confidence * 100).toFixed(1) : "0.0"}%</span>
            <span className="text-slate-500">confidence</span>
          </div>
        </div>

        {/* Metric 2: Sampling Rate */}
        <div 
          id="metric-sampling-rate"
          className="rounded-xl bg-[#0B120F] border border-[#172720] hover:border-emerald-500/40 p-4 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center space-x-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>SAMPLING RATE</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-white tracking-tight mt-1">
            {analysisResult ? analysisResult.params.sampling_rate_hz.toLocaleString() : "—"}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {analysisResult ? analysisResult.params.symbol_rate_hz.toLocaleString() : "—"} baud
          </div>
        </div>

        {/* Metric 3: Bits Extracted */}
        <div 
          id="metric-bits-extracted"
          className="rounded-xl bg-[#0B120F] border border-[#172720] hover:border-emerald-500/40 p-4 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center space-x-1.5">
              <Binary className="w-3 h-3 text-emerald-400" />
              <span>BITS EXTRACTED</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-white tracking-tight mt-1">
            {analysisResult ? (analysisResult.correlation?.payload_len_bits || analysisResult.demod?.bits || 0).toLocaleString() : "—"}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            From IQ data
          </div>
        </div>

        {/* Metric 4: Sync Correlation */}
        <div 
          id="metric-sync-correlation"
          className="rounded-xl bg-[#0B120F] border border-[#172720] hover:border-emerald-500/40 p-4 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center space-x-1.5">
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>SYNC HITS</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-white tracking-tight mt-1">
            {analysisResult ? analysisResult.correlation?.num_hits || 0 : "—"}
          </div>
          <div className="text-[11px] font-mono text-emerald-400/90 mt-1 truncate" title={analysisResult?.correlation?.framing || "N/A"}>
            {analysisResult?.correlation?.framing || "N/A"}
          </div>
        </div>

        {/* Metric 5: Pipeline Status */}
        <div 
          id="metric-pipeline-status"
          className="rounded-xl bg-[#0B120F] border border-[#172720] hover:border-emerald-500/40 p-4 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>PIPELINE STATUS</span>
            </span>
          </div>
          <div className="font-display font-bold text-2xl text-emerald-400 tracking-tight mt-1">
            {analysisResult ? "Complete" : "Pending"}
          </div>
          {/* 100% Progress Bar */}
          <div className="mt-2.5 flex items-center space-x-2">
            <div className="flex-1 h-1.5 bg-[#172620] rounded-full overflow-hidden">
              <div className={`h-full bg-emerald-400 rounded-full w-full ${analysisResult ? 'shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'w-0'}`}></div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400">{analysisResult ? "100%" : "0%"}</span>
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
            modulation={activeSignal.modulation}
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

      {/* Signal Payload & Tactical Summary Strip */}
      <div 
        id="panel-tactical-summary"
        className="rounded-xl bg-[#0B120F] border border-[#172720] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Target Capture: {activeSignal.name}
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                activeSignal.threatLevel === 'High' || activeSignal.threatLevel === 'Classified'
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              }`}>
                {activeSignal.threatLevel} Security Tier
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {activeSignal.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
          <button
            id="btn-inspect-stream"
            onClick={() => onNavigate('ingest')}
            className="px-3.5 py-1.5 rounded-lg bg-[#14211B] hover:bg-[#1A2E25] border border-[#233B2F] text-xs font-mono text-emerald-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Inspect Bitstream</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
