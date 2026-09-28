/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { IngestView } from './components/IngestView';
import { VisualizationsView } from './components/VisualizationsView';
import { DAGPipelineView } from './components/DAGPipelineView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { CommandPalette } from './components/CommandPalette';
import { PRESET_SIGNALS, INITIAL_DAG_STEPS } from './data/mockSignals';
import { NavigationTab, SignalSample, LogEntry, BackendResult } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [presetSignals, setPresetSignals] = useState<SignalSample[]>(PRESET_SIGNALS);
  const [activeSignal, setActiveSignal] = useState<SignalSample>(PRESET_SIGNALS[0]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  // Real backend result state
  const [analysisResult, setAnalysisResult] = useState<BackendResult | null>(null);
  const [dagSteps, setDagSteps] = useState(INITIAL_DAG_STEPS);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleAddLog = (entry: Omit<LogEntry, 'id'>) => {
    setLogs((prev) => [
      ...prev,
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}` },
    ]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div id="app-root-shell" className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Tactical Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Tactical Header */}
        <Header
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          activeSignal={activeSignal}
          presetSignals={presetSignals}
          onSelectSignal={setActiveSignal}
          onRefreshData={() => {
            handleAddLog({
              timestamp: new Date().toTimeString().split(' ')[0],
              level: 'INFO',
              message: 'Hardware SDR sample clock re-calibrated (+0.02 ppm offset)'
            });
          }}
        />

        {/* Scrollable Viewport */}
        <main id="main-viewport-content" className="flex-1 overflow-y-auto overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardView
              activeSignal={activeSignal}
              analysisResult={analysisResult}
              onNavigate={setCurrentTab}
              onRunAnalysis={() => setCurrentTab('ingest')}
            />
          )}

          {(currentTab === 'ingest' || currentTab === 'analysis') && (
            <IngestView
              dagSteps={dagSteps}
              setDagSteps={setDagSteps}
              activeSignal={activeSignal}
              presetSignals={presetSignals}
              onSelectSignal={setActiveSignal}
              logs={logs}
              onAddLog={handleAddLog}
              onClearLogs={handleClearLogs}
              onAnalysisComplete={(result, jobId) => {
                setAnalysisResult(result);
                setActiveJobId(jobId);
              }}
              onAnalysisStart={() => {
                setAnalysisResult(null);
                setActiveJobId(null);
              }}
              analysisResult={analysisResult}
            />
          )}

          {currentTab === 'visualizations' && (
            <VisualizationsView 
              activeSignal={activeSignal} 
              analysisResult={analysisResult} 
            />
          )}

          {currentTab === 'dag-pipeline' && (
            <DAGPipelineView dagSteps={dagSteps} />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              activeSignal={activeSignal}
              presetSignals={presetSignals}
              analysisResult={analysisResult}
              activeJobId={activeJobId}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Ctrl+K Search Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={setCurrentTab}
        presetSignals={presetSignals}
        onSelectSignal={setActiveSignal}
      />
    </div>
  );
}
