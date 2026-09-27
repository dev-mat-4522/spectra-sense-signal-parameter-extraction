import React, { useState } from 'react';
import { Workflow, Play, CheckCircle2, Clock, AlertTriangle, Layers, Database, ArrowRight } from 'lucide-react';
import { DAGStep } from '../types';
import { INITIAL_DAG_STEPS } from '../data/mockSignals';

interface DAGPipelineViewProps {
  onRunDAG: () => void;
}

export const DAGPipelineView: React.FC<DAGPipelineViewProps> = () => {
  const [steps, setSteps] = useState<DAGStep[]>(INITIAL_DAG_STEPS);
  const [selectedStep, setSelectedStep] = useState<DAGStep>(steps[3]);
  const [isRunning, setIsRunning] = useState(false);

  const totalLatency = steps.reduce((acc, s) => acc + s.latencyMs, 0);

  const runPipeline = () => {
    setIsRunning(true);
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        const id = idx + 1;
        setSteps(prev => prev.map(s => {
          if (s.id === id) return { ...s, status: 'running' };
          if (s.id < id) return { ...s, status: 'completed' };
          return s;
        }));
        setSelectedStep(steps[idx]);
        idx++;
      } else {
        clearInterval(interval);
        setSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setIsRunning(false);
      }
    }, 250);
  };

  return (
    <div id="dag-pipeline-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#16251E] gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Workflow className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-white">
              TACTICAL DSP DAG PIPELINE ARCHITECTURE
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Directed Acyclic Graph orchestrator executing multi-stage RF channelization, AMC classification, and forward error correction.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#0E1613] border border-[#1B2F25] text-xs font-mono text-slate-300">
            TOTAL LATENCY: <span className="text-emerald-400 font-bold">{totalLatency} ms</span>
          </div>

          <button
            id="btn-re-execute-dag"
            onClick={runPipeline}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'PIPELINE RUNNING...' : 'TRIGGER FULL DAG'}</span>
          </button>
        </div>
      </div>

      {/* DAG Flow Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Step Flow Cards */}
        <div className="lg:col-span-2 space-y-3">
          {steps.map((step, idx) => {
            const isSelected = selectedStep.id === step.id;
            return (
              <div
                key={step.id}
                onClick={() => setSelectedStep(step)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#101B16] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-[#0B120F] border-[#162720] hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                    step.status === 'running'
                      ? 'bg-amber-500 text-black animate-pulse'
                      : step.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#121B17] text-slate-600'
                  }`}>
                    {step.id}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-mono">{step.name}</span>
                      <span className="text-xs text-slate-400 font-sans">({step.label})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{step.details}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{step.latencyMs} ms</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 1 Col: Selected Node Inspector */}
        <div className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 space-y-5 h-fit sticky top-24">
          <div className="border-b border-[#16251E] pb-3 flex justify-between items-center">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">NODE TELEMETRY INSPECTOR</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
              STATUS: {selectedStep.status.toUpperCase()}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">STAGE IDENTIFIER</span>
              <span className="text-white font-bold text-base">{selectedStep.name}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px]">OPERATIONAL DESCRIPTION</span>
              <p className="text-slate-300 font-sans text-xs mt-1 leading-relaxed bg-[#080E0B] p-3 rounded-lg border border-[#14231B]">
                {selectedStep.details}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#080E0B] p-2.5 rounded border border-[#14231B]">
                <span className="text-slate-500 block text-[9px]">BENCHMARK LATENCY</span>
                <span className="text-emerald-400 font-bold text-sm">{selectedStep.latencyMs} ms</span>
              </div>
              <div className="bg-[#080E0B] p-2.5 rounded border border-[#14231B]">
                <span className="text-slate-500 block text-[9px]">MEMORY BUFFER</span>
                <span className="text-emerald-400 font-bold text-sm">512 KB TENSOR</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 block text-[10px] mb-1">COMPUTE ENGINE ACCELERATION</span>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>AVX-512 SIMD Vectorized FFT Kernel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
