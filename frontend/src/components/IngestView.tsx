import React, { useState } from 'react';
import { 
  UploadCloud, 
  Settings2, 
  FileCode2, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  FileText, 
  Radio, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Database
} from 'lucide-react';
import { SignalSample, DAGStep, LogEntry, ModulationType, BackendResult } from '../types';
import { INITIAL_DAG_STEPS } from '../data/mockSignals';

interface IngestViewProps {
  activeSignal: SignalSample;
  presetSignals: SignalSample[];
  onSelectSignal: (sig: SignalSample) => void;
  logs: LogEntry[];
  onAddLog: (entry: Omit<LogEntry, 'id'>) => void;
  onClearLogs: () => void;
  onAnalysisStart: () => void;
  onAnalysisComplete: (result: BackendResult, jobId: string) => void;
  analysisResult?: BackendResult | null;
}

export const IngestView: React.FC<IngestViewProps> = ({
  activeSignal,
  presetSignals,
  onSelectSignal,
  logs,
  onAddLog,
  onClearLogs,
  onAnalysisStart,
  onAnalysisComplete,
  analysisResult,
}) => {
  const [sampleRate, setSampleRate] = useState<number>(activeSignal.sampleRate || 100000);
  const [modulationOverride, setModulationOverride] = useState<ModulationType>('16-QAM');
  const [deinterleaver, setDeinterleaver] = useState('NONE');
  const [fecDecoder, setFecDecoder] = useState('NONE');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasDecoded, setHasDecoded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dagSteps, setDagSteps] = useState<DAGStep[]>(INITIAL_DAG_STEPS);
  const [selectedStep, setSelectedStep] = useState<DAGStep | null>(dagSteps[3]); // AMC selected
  const [fileName, setFileName] = useState<string>('');
  const [fileObj, setFileObj] = useState<File | null>(null);

  const handleRunAnalysis = async () => {
    if (!fileObj) {
      alert("Please upload an .IQ or .WAV file first.");
      return;
    }

    setIsAnalyzing(true);
    setHasDecoded(false);
    onAnalysisStart();
    
    // Reset steps to pending
    setDagSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));

    onAddLog({
      timestamp: new Date().toTimeString().split(' ')[0],
      level: 'INFO',
      message: `Uploading file ${fileName}...`
    });

    try {
      // 1. Upload
      const formData = new FormData();
      formData.append('file', fileObj);
      const upRes = await fetch((import.meta.env.VITE_API_URL || '') + '/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!upRes.ok) throw new Error(await upRes.text());
      const { job_id } = await upRes.json();

      onAddLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'INFO',
        message: `Upload complete. Starting analysis (Job: ${job_id})...`
      });

      // 2. Start Analyze
      const anRes = await fetch((import.meta.env.VITE_API_URL || '') + `/api/analyze/${job_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_rate_hz: sampleRate,
          modulation: modulationOverride,
          deinterleaver: deinterleaver.toLowerCase().includes("none") ? "none" : deinterleaver,
          fec: fecDecoder.toLowerCase().includes("none") ? "none" : fecDecoder
        })
      });
      if (!anRes.ok) throw new Error(await anRes.text());

      // 3. Poll Status
      setDagSteps(prev => prev.map(s => s.id <= 3 ? { ...s, status: 'running' } : s));
      let currentProgress = 0;
      
      const poll = setInterval(async () => {
        const res = await fetch((import.meta.env.VITE_API_URL || '') + `/api/results/${job_id}`);
        if (!res.ok) return;
        const job = await res.json();
        
        if (job.progress > currentProgress) {
          currentProgress = job.progress;
          // approximate steps based on progress
          const stepNum = Math.min(10, Math.ceil(currentProgress / 10));
          setDagSteps(prev => prev.map(s => {
            if (s.id === stepNum) return { ...s, status: 'running' };
            if (s.id < stepNum) return { ...s, status: 'completed' };
            return s;
          }));
        }

        if (job.status === "done") {
          clearInterval(poll);
          setDagSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
          setIsAnalyzing(false);
          setHasDecoded(true);
          
          onAnalysisComplete(job.result, job_id);

          if (job.result && job.result.fec) {
             const ber = job.result.fec.detection?.closure_ber ?? "N/A";
             onAddLog({
                timestamp: new Date().toTimeString().split(' ')[0],
                level: 'SUCCESS',
                message: `Pipeline Completed: Modulation ${job.result.demod?.modulation} decoded successfully. FEC: ${job.result.fec.method}, BER: ${ber}`
             });
          }
        } else if (job.status === "error") {
          clearInterval(poll);
          setIsAnalyzing(false);
          setDagSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'pending' } : s));
          onAddLog({
            timestamp: new Date().toTimeString().split(' ')[0],
            level: 'ERROR',
            message: `Pipeline Error: ${job.error}`
          });
        }
      }, 1000);

    } catch (err: any) {
      setIsAnalyzing(false);
      onAddLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'ERROR',
        message: `Error: ${err.message}`
      });
    }
  };

  const handleCopyPayload = () => {
    const hex = analysisResult?.correlation?.payload_hex || "";
    const ascii = analysisResult?.correlation?.payload_ascii?.join('\n') || "";
    navigator.clipboard.writeText(`${hex}\n\n${ascii}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setFileObj(file);
      onAddLog({
        timestamp: new Date().toTimeString().split(' ')[0],
        level: 'INFO',
        message: `File ingested: ${file.name} (${Math.round(file.size / 1024)} KB)`
      });
    }
  };

  const hexPayloadStr = analysisResult?.correlation?.payload_hex || "";
  const hexPayloadRows = hexPayloadStr.match(/.{1,32}/g) || [];
  const asciiPayload = analysisResult?.correlation?.payload_ascii?.join('\n') || "NO ASCII DATA";
  const bitsCount = analysisResult?.correlation?.payload_len_bits || analysisResult?.demod?.bits || 0;
  const bitErrorRate = analysisResult?.fec?.detection?.closure_ber ?? "N/A";
  const frameSync = (analysisResult?.correlation?.num_hits ?? 0) > 0 ? "LOCKED" : "SEARCHING";

  return (
    <div id="ingest-workspace-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Top 3 Column Workstation Grid (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Panel 1: INGEST SIGNAL */}
        <div 
          id="panel-ingest-signal"
          className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16251E]">
              <div className="flex items-center space-x-2 text-white">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                  INGEST SIGNAL
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400/80 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/30">
                RAW IQ / WAV
              </span>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="mt-4 border-2 border-dashed border-[#1E3329] hover:border-emerald-500/50 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#090F0C] transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-[#121F19] flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-3 border border-[#1A3125]">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Drag & drop your <span className="text-emerald-400 font-mono">.IQ</span> or <span className="text-emerald-400 font-mono">.WAV</span> file here
              </p>
              <p className="text-[11px] text-slate-500 my-1.5">or</p>
              <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-[#14231C] hover:bg-[#1A2E25] border border-[#233D30] text-xs font-mono font-semibold text-emerald-300 transition-colors">
                BROWSE FILES
                <input
                  type="file"
                  accept=".iq,.wav,.bin,.raw"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFileName(e.target.files[0].name);
                      setFileObj(e.target.files[0]);
                      onAddLog({
                        timestamp: new Date().toTimeString().split(' ')[0],
                        level: 'INFO',
                        message: `File selected: ${e.target.files[0].name}`
                      });
                    }
                  }}
                />
              </label>

              {fileName && (
                <div className="mt-3 text-[11px] font-mono text-slate-400 flex items-center space-x-1.5 truncate max-w-full">
                  <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}
            </div>

            {/* Base Sample Rate Input */}
            <div className="mt-4">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                BASE SAMPLE RATE (HZ)
              </label>
              <input
                id="input-sample-rate"
                type="number"
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-[#0E1713] border border-[#1C3026] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/70"
                placeholder="100000"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1.5">
                *Required for raw dimensionless .IQ files
              </p>
            </div>
          </div>

          {/* Quick Demo Preload Buttons */}
          <div className="pt-3 mt-4 border-t border-[#16251E]">
            <span className="text-[10px] font-mono text-slate-500 block mb-2">QUICK TACTICAL PRESETS:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {presetSignals.slice(0, 2).map((sig) => (
                <button
                  key={sig.id}
                  onClick={() => {
                    onSelectSignal(sig);
                    setFileName(`${sig.name.replace(/\s+/g, '_')}.iq`);
                    setSampleRate(sig.sampleRate);
                    setModulationOverride(sig.modulation);
                  }}
                  className="px-2 py-1.5 rounded bg-[#101915] hover:bg-[#16241E] border border-[#1A2E24] text-[10px] font-mono text-slate-300 hover:text-emerald-300 text-left truncate transition-colors"
                >
                  {sig.name.split(' ')[0]} ({sig.modulation})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: ANALYSIS CONFIGURATION */}
        <div 
          id="panel-analysis-configuration"
          className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16251E]">
              <div className="flex items-center space-x-2 text-white">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                  ANALYSIS CONFIGURATION
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400/80">DSP STACK</span>
            </div>

            <div className="space-y-4 mt-4">
              {/* Modulation Override Dropdown */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                  MODULATION OVERRIDE
                </label>
                <select
                  id="select-modulation-override"
                  value={modulationOverride}
                  onChange={(e) => setModulationOverride(e.target.value as ModulationType)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1713] border border-[#1C3026] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/70 cursor-pointer"
                >
                  <option value="QAM-16">QAM-16 (16-ary Quadrature)</option>
                  <option value="QPSK">QPSK (Quadrature Phase)</option>
                  <option value="8-PSK">8-PSK (8-Phase Shift)</option>
                  <option value="64-QAM">64-QAM (High-order)</option>
                  <option value="BPSK">BPSK (Binary Phase)</option>
                  <option value="FSK">FSK (Frequency Shift)</option>
                </select>
              </div>

              {/* De-interleaver Dropdown */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                  DE-INTERLEAVER
                </label>
                <select
                  id="select-deinterleaver"
                  value={deinterleaver}
                  onChange={(e) => setDeinterleaver(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1713] border border-[#1C3026] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/70 cursor-pointer"
                >
                  <option value="CONVOLUTIONAL">CONVOLUTIONAL (Matrix Depth 16)</option>
                  <option value="BLOCK">BLOCK INTERLEAVER (CCSDS)</option>
                  <option value="HELICAL">HELICAL SCAN</option>
                  <option value="NONE">PASSTHROUGH (NONE)</option>
                </select>
              </div>

              {/* FEC Decoder Dropdown */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                  FEC DECODER
                </label>
                <select
                  id="select-fec-decoder"
                  value={fecDecoder}
                  onChange={(e) => setFecDecoder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0E1713] border border-[#1C3026] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/70 cursor-pointer"
                >
                  <option value="NONE">NONE / BYPASS</option>
                  <option value="VITERBI 1/2">VITERBI 1/2 (K=7, Polynomial G1=171, G2=133)</option>
                  <option value="REED-SOLOMON">REED-SOLOMON (255, 223)</option>
                  <option value="LDPC">LDPC (Stub — Not Full Implementation)</option>
                  <option value="TURBO">TURBO CODE 1/3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Run Signal Analysis Button */}
          <div className="pt-4 mt-4 border-t border-[#16251E]">
            <button
              id="btn-run-signal-analysis"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                isAnalyzing
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_28px_rgba(16,185,129,0.5)]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>EXECUTING DAG PIPELINE...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>RUN SIGNAL ANALYSIS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Panel 3: DECODED OUTPUT */}
        <div 
          id="panel-decoded-output"
          className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16251E]">
              <div className="flex items-center space-x-2 text-white">
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                  DECODED OUTPUT
                </h3>
              </div>
              <button
                id="btn-copy-output"
                onClick={handleCopyPayload}
                disabled={!hasDecoded}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#101915] border border-[#1B2F25] text-[11px] font-mono text-slate-300 hover:text-emerald-400 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Decoded Content Body */}
            {hasDecoded ? (
              <div className="mt-4 space-y-3 font-mono text-xs">
                {/* Hex Dump Section */}
                <div className="bg-[#080E0B] p-3 rounded-lg border border-[#15251E]">
                  <div className="text-[10px] text-emerald-500 font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                    <span>FRAME HEXSTREAM</span>
                    <span className="text-slate-500">{bitsCount} BITS</span>
                  </div>
                  <div className="text-slate-300 space-y-0.5 text-[11px] select-text">
                    {hexPayloadRows.map((row, idx) => (
                      <div key={idx} className="flex space-x-2">
                        <span className="text-slate-600">0x{(idx * 16).toString(16).padStart(4, '0')}:</span>
                        <span className="text-emerald-400/90">{row}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decoded ASCII / Protocol Telemetry */}
                <div className="bg-[#080E0B] p-3 rounded-lg border border-[#15251E]">
                  <div className="text-[10px] text-emerald-500 font-semibold mb-1 uppercase tracking-wider">
                    PARSED PROTOCOL PAYLOAD
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed break-words select-text whitespace-pre-wrap">
                    {asciiPayload}
                  </p>
                </div>
              </div>
            ) : (
              <div className="my-14 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-[#101815] border border-[#182C22] flex items-center justify-center text-slate-600 mb-3">
                  <Terminal className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-slate-300">
                  AWAITING SIGNAL
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                  Upload an IQ/WAV capture in the Ingest panel to begin spectrum intelligence analysis.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-[#16251E] flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span>BIT ERROR RATE: <span className="text-emerald-400 font-bold">{bitErrorRate}</span></span>
            <span>FRAME SYNC: <span className="text-emerald-400">{frameSync}</span></span>
          </div>
        </div>
      </div>

      {/* Bottom Row: DAG Pipeline & System Log (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: DAG PIPELINE */}
        <div 
          id="panel-dag-pipeline"
          className="lg:col-span-2 rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16251E]">
              <div className="flex items-center space-x-2 text-white">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                  DAG PIPELINE
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                10 ACTIVE PROCESSING STAGES
              </span>
            </div>

            {/* Horizontal 10-Step DAG Chain (Exact visual match from Screenshot 2) */}
            <div className="mt-6 overflow-x-auto pb-2">
              <div className="flex items-center justify-between min-w-[620px] relative px-2">
                {/* Connecting track line behind nodes */}
                <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-[#182C22] -z-0"></div>

                {dagSteps.map((step) => {
                  const isCompleted = step.status === 'completed';
                  const isRunning = step.status === 'running';
                  const isCurrentSelected = selectedStep?.id === step.id;

                  return (
                    <div 
                      key={step.id} 
                      className="flex flex-col items-center relative z-10 cursor-pointer group"
                      onClick={() => setSelectedStep(step)}
                    >
                      {/* Node number badge */}
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center font-mono text-xs font-bold transition-all ${
                        isRunning
                          ? 'bg-amber-500 text-black animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : isCompleted
                          ? step.id === 10
                            ? 'bg-emerald-950 text-emerald-300 border-2 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-[#101B16] text-emerald-400 border border-emerald-500/50'
                          : 'bg-[#0E1513] text-slate-600 border border-[#1A2C23]'
                      } ${isCurrentSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0B120F]' : ''}`}>
                        {step.id}
                      </div>

                      {/* Step Name Label */}
                      <span className={`text-[9px] font-mono tracking-wider font-bold mt-2 uppercase ${
                        isRunning
                          ? 'text-amber-400'
                          : isCompleted
                          ? 'text-emerald-400'
                          : 'text-slate-600'
                      }`}>
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Step Detail Inspector */}
            {selectedStep && (
              <div className="mt-5 p-3.5 rounded-lg bg-[#080E0B] border border-[#172720] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-emerald-400 font-bold">Stage {selectedStep.id}: {selectedStep.name}</span>
                  <span className="text-slate-400 ml-2">({selectedStep.label})</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedStep.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">LATENCY</span>
                  <span className="text-emerald-400 font-bold">{selectedStep.latencyMs} ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: SYSTEM LOG (Matching Screenshot 2) */}
        <div 
          id="panel-system-log"
          className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16251E]">
              <div className="flex items-center space-x-2 text-white">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
                  SYSTEM LOG
                </h3>
              </div>
              <button
                id="btn-clear-logs"
                onClick={onClearLogs}
                className="px-2 py-0.5 rounded bg-[#101915] border border-[#1A2E24] text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            {/* Log Terminal Window */}
            <div className="mt-3 bg-[#080D0B] p-3 rounded-lg border border-[#14221A] font-mono text-[10px] space-y-1.5 h-48 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2 leading-tight">
                  <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                  <span className={`shrink-0 font-bold ${
                    log.level === 'INFO'
                      ? 'text-slate-400'
                      : log.level === 'ANALYSIS'
                      ? 'text-teal-400'
                      : log.level === 'SUCCESS'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-slate-300 break-words">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-[10px] font-mono text-slate-500 flex justify-between">
            <span>DAEMON: rf_dsp_v2</span>
            <span className="text-emerald-400">ACTIVE PID 8941</span>
          </div>
        </div>

      </div>
    </div>
  );
};
