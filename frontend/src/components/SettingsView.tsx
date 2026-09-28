import React, { useState } from 'react';
import { Settings, Shield, Sliders, HardDrive, Bell, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [autoClassify, setAutoClassify] = useState(true);
  const [fftWindow, setFftWindow] = useState('Hann');
  const [iqFormat, setIqFormat] = useState('Float32 Interleaved');
  const [noiseFloorThreshold, setNoiseFloorThreshold] = useState(-85);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div id="settings-container" className="p-6 space-y-6 max-w-[1200px] mx-auto select-none">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-slate-900">
              SYSTEM & DSP CONFIGURATION
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tactical rig settings, hardware sample clock sync, and RF front-end calibration.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs font-mono transition-all shadow-sm"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
          <span>{saved ? 'SETTINGS SAVED' : 'SAVE CONFIGURATION'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DSP Front-End Settings */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-blue-600 flex items-center space-x-2">
            <Sliders className="w-4 h-4" />
            <span>FRONT-END DSP ENGINE</span>
          </h3>

          <div>
            <label className="block text-xs font-mono text-slate-700 mb-1.5">FFT Window Function</label>
            <select
              value={fftWindow}
              onChange={(e) => setFftWindow(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none"
            >
              <option value="Hann">Hann (Standard RF Spectrum)</option>
              <option value="Blackman-Harris">Blackman-Harris (High Dynamic Range)</option>
              <option value="Flat Top">Flat Top (Amplitude Accuracy)</option>
              <option value="Rectangular">Rectangular (Transient Pulses)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-700 mb-1.5">I/Q Sample Data Encoding</label>
            <select
              value={iqFormat}
              onChange={(e) => setIqFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none"
            >
              <option value="Float32 Interleaved">Float32 Interleaved (Standard SDR)</option>
              <option value="Int16 Two's Complement">Int16 Two's Complement</option>
              <option value="Complex64 Double">Complex64 Double Precision</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-700 mb-1.5">
              <span>Energy Burst Noise Threshold</span>
              <span className="text-blue-600 font-bold">{noiseFloorThreshold} dBm</span>
            </div>
            <input
              type="range"
              min="-120"
              max="-40"
              value={noiseFloorThreshold}
              onChange={(e) => setNoiseFloorThreshold(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Security & Corporate Compliance */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-blue-600 flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>SECURITY & COMPLIANCE</span>
          </h3>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Auto AMC Classification</span>
              <span className="text-[11px] text-slate-500">Execute neural classifier on raw bursts automatically</span>
            </div>
            <input
              type="checkbox"
              checked={autoClassify}
              onChange={(e) => setAutoClassify(e.target.checked)}
              className="accent-blue-600 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
            <span className="text-slate-500 block text-[10px]">CORPORATE SECURITY LICENSE</span>
            <div className="text-slate-900 font-bold">SpectraSense Defense Edition v1.0.0</div>
            <div className="text-blue-600 text-[11px]">AUTHENTICATED RIG ID: ALPHA-001-SEC</div>
          </div>
        </div>
      </div>
    </div>
  );
};
