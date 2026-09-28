import React, { useState } from 'react';
import { Workflow, Play, CheckCircle2, Clock, AlertTriangle, Layers, Database, ArrowRight } from 'lucide-react';
import { DAGStep } from '../types';

interface DAGPipelineViewProps {
  dagSteps: DAGStep[];
}

export const DAGPipelineView: React.FC<DAGPipelineViewProps> = ({ dagSteps }) => {
  const [selectedStep, setSelectedStep] = useState<DAGStep>(dagSteps[3]);
  const isRunning = dagSteps.some(s => s.status === 'running');

  return (
    <div id="dag-pipeline-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Workflow className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-slate-900">
              DSP / ML PROTOCOL PIPELINE
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Directed Acyclic Graph (DAG) execution trace. Real-time telemetry extraction routing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            disabled
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-400 font-bold text-sm uppercase rounded cursor-not-allowed border border-slate-200 shadow-sm"
          >
            <Play className="w-4 h-4" />
            <span>AUTO-ROUTED</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Pipeline Flow */}
        <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-sm p-5 relative overflow-hidden">
          <h3 className="text-xs font-mono font-bold tracking-wider text-slate-900 mb-6 uppercase flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Execution Nodes</span>
          </h3>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100" />

            <div className="space-y-4">
              {dagSteps.map((step, index) => {
                const isSelected = selectedStep.id === step.id;
                const isComplete = step.status === 'completed';
                const isRunningNode = step.status === 'running';
                const isFailed = step.status === 'failed';

                return (
                  <div 
                    key={step.id} 
                    className="relative flex items-center cursor-pointer group"
                    onClick={() => setSelectedStep(step)}
                  >
                    {/* Node Dot */}
                    <div className="absolute left-6 transform -translate-x-1/2 flex items-center justify-center">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
                        ${isComplete ? 'bg-blue-600 border-blue-600 text-white' : 
                          isRunningNode ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse' : 
                          isFailed ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-400'}`}
                      >
                        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : 
                         isRunningNode ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                         isFailed ? <AlertTriangle className="w-4 h-4" /> :
                         <span className="text-[10px] font-bold">{step.id}</span>}
                      </div>
                    </div>

                    {/* Node Card */}
                    <div className={`ml-16 flex-1 rounded-lg border transition-all duration-300
                      ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'}
                      p-3`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded
                            ${isComplete ? 'bg-blue-100 text-blue-700' : 
                              isRunningNode ? 'bg-blue-100 text-blue-600' : 
                              isFailed ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            {step.name}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{step.label}</span>
                        </div>
                        {step.latencyMs !== undefined && (
                          <div className="flex items-center space-x-1 text-slate-500 text-xs font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{step.latencyMs} ms</span>
                          </div>
                        )}
                      </div>
                      
                      {step.details && (
                        <p className={`mt-2 text-xs font-mono
                          ${isSelected ? 'text-slate-700' : 'text-slate-500'}`}
                        >
                          {step.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Node Inspector Panel */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-0 flex flex-col overflow-hidden h-fit sticky top-6">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-mono font-bold text-slate-900 uppercase">NODE INSPECTOR</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
              ID: {selectedStep.id.toString().padStart(4, '0')}
            </span>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Node Identifier</label>
              <div className="text-sm font-semibold text-slate-900">{selectedStep.name} ({selectedStep.label})</div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Execution Status</label>
              <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold uppercase
                ${selectedStep.status === 'completed' ? 'bg-blue-100 text-blue-700' : 
                  selectedStep.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' : 
                  selectedStep.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {selectedStep.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {selectedStep.status === 'running' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {selectedStep.status === 'failed' && <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{selectedStep.status}</span>
              </div>
            </div>

            {selectedStep.latencyMs !== undefined && (
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Processing Latency</label>
                <div className="text-xs font-mono text-slate-800">{selectedStep.latencyMs} ms</div>
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">Diagnostic Output</label>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-700 leading-relaxed min-h-[60px]">
                {selectedStep.details || 'No output captured for this node.'}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors rounded text-blue-700 text-xs font-mono font-bold border border-blue-200 shadow-sm">
                <span>View Memory Dump</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

function RefreshCw(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
}
