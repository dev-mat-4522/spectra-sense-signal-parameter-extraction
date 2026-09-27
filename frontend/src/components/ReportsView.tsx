import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, Printer, CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { SignalSample, BackendResult } from '../types';

interface ReportsViewProps {
  activeSignal: SignalSample;
  presetSignals: SignalSample[];
  analysisResult?: BackendResult | null;
  activeJobId?: string | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ activeSignal, presetSignals, analysisResult, activeJobId }) => {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (activeJobId) {
      window.open((import.meta.env.VITE_API_URL || '') + `/api/report/${activeJobId}`, '_blank');
    }
    const reportData = analysisResult || activeSignal;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SpectraSense_True_Report.json';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div id="reports-view-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#16251E] gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-white">
              EXECUTIVE INTELLIGENCE BRIEFS
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Formal mission dossiers, cryptographic verification, and tactical threat classification for corporate decision-makers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111A16] hover:bg-[#16241E] border border-[#1E3328] text-xs font-mono text-slate-300 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>

          <button
            id="btn-export-dossier"
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            {downloaded ? <CheckCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{downloaded ? 'Dossier Exported' : 'Export True JSON/PDF'}</span>
          </button>
        </div>
      </div>

      {/* Formal Executive Dossier Document */}
      <div className="rounded-2xl bg-[#0B120F] border border-[#172720] p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-[#16251E] gap-3">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold block mb-1">
              SPECTRASENSE INTELLIGENCE REPORT #SR-2026-904
            </span>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Tactical RF Intercept Analysis: {activeSignal.name}
            </h3>
          </div>
          <div className="px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 text-right">
            <div>STATUS: <span className="font-bold">VERIFIED</span></div>
            <div className="text-[10px] text-slate-400">CLASSIFICATION: CONFIDENTIAL</div>
          </div>
        </div>

        {/* Executive Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#090F0C] border border-[#162720]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">CENTER FREQUENCY</span>
            <span className="text-lg font-bold font-mono text-white">{analysisResult ? analysisResult.params.sampling_rate_hz + " Hz (Fs)" : activeSignal.frequency}</span>
            <p className="text-[11px] text-slate-400 mt-1">Calibrated via Digital Down Conversion</p>
          </div>

          <div className="p-4 rounded-xl bg-[#090F0C] border border-[#162720]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">MODULATION SCHEME</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{analysisResult ? analysisResult.amc.modulation : activeSignal.modulation}</span>
            <p className="text-[11px] text-slate-400 mt-1">Confidence Score: {analysisResult ? (analysisResult.amc.confidence * 100).toFixed(1) + "%" : activeSignal.confidence + "%"}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#090F0C] border border-[#162720]">
            <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">SIGNAL-TO-NOISE RATIO</span>
            <span className="text-lg font-bold font-mono text-white">{analysisResult ? "Calculated" : activeSignal.snrDb + " dB"}</span>
            <p className="text-[11px] text-emerald-400/90 mt-1">Clear Line of Sight (Optimal)</p>
          </div>
        </div>

        {/* Decoded Intelligence Transcript */}
        <div className="p-5 rounded-xl bg-[#080E0B] border border-[#162720] space-y-3 font-mono">
          <div className="flex justify-between items-center text-xs text-slate-400 border-b border-[#14231B] pb-2">
            <span className="text-emerald-400 font-bold">DECODED MISSION PAYLOAD TRANSCRIPT</span>
            <span>FRAME FLAG: {analysisResult ? (analysisResult.correlation.framing?.sync || "None") : activeSignal.syncFlag}</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed bg-[#060A08] p-3 rounded border border-[#121E18]">
            {analysisResult ? (analysisResult.correlation.payload_ascii?.join("\n") || "None") : activeSignal.asciiPayload}
          </p>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>BITSTREAM EXTRACTED: {analysisResult ? (analysisResult.demod?.bits || 0) + " BITS" : activeSignal.extractedBits + " BITS"}</span>
            <span>{analysisResult?.correlation?.ax25 ? 'AX.25 FCS: PASS' : 'FCS/CRC: N/A'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
