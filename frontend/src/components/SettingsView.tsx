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
      <div className="flex items-center justify-between pb-4 border-b border-[#16251E]">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-white">
              SYSTEM & DSP CONFIGURATION
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tactical rig settings, hardware sample clock sync, and RF front-end calibration.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs font-mono transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : null}
          <span>{saved ? 'SETTINGS SAVED' : 'SAVE CONFIGURATION'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DSP Front-End Settings */}
        <div className="p-6 rounded-xl bg-[#0B120F] border border-[#162720] space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center space-x-2">
            <Sliders className="w-4 h-4" />
            <span>FRONT-END DSP ENGINE</span>
          </h3>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">FFT Window Function</label>
            <select
              value={fftWindow}
              onChange={(e) => setFftWindow(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0E1613] border border-[#1C2F25] text-xs font-mono text-white focus:outline-none"
            >
              <option value="Hann">Hann (Standard RF Spectrum)</option>
              <option value="Blackman-Harris">Blackman-Harris (High Dynamic Range)</option>
              <option value="Flat Top">Flat Top (Amplitude Accuracy)</option>
              <option value="Rectangular">Rectangular (Transient Pulses)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">I/Q Sample Data Encoding</label>
            <select
              value={iqFormat}
              onChange={(e) => setIqFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0E1613] border border-[#1C2F25] text-xs font-mono text-white focus:outline-none"
            >
              <option value="Float32 Interleaved">Float32 Interleaved (Standard SDR)</option>
              <option value="Int16 Two's Complement">Int16 Two's Complement</option>
              <option value="Complex64 Double">Complex64 Double Precision</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1.5">
              <span>Energy Burst Noise Threshold</span>
              <span className="text-emerald-400 font-bold">{noiseFloorThreshold} dBm</span>
            </div>
            <input
              type="range"
              min="-120"
              max="-40"
              value={noiseFloorThreshold}
              onChange={(e) => setNoiseFloorThreshold(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Security & Corporate Compliance */}
        <div className="p-6 rounded-xl bg-[#0B120F] border border-[#162720] space-y-4">
          <h3 className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>SECURITY & COMPLIANCE</span>
          </h3>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#080E0B] border border-[#14231B]">
            <div>
              <span className="text-xs font-semibold text-white block">Auto AMC Classification</span>
              <span className="text-[11px] text-slate-400">Execute neural classifier on raw bursts automatically</span>
            </div>
            <input
              type="checkbox"
              checked={autoClassify}
              onChange={(e) => setAutoClassify(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#080E0B] border border-[#14231B] text-xs font-mono space-y-1">
            <span className="text-slate-400 block text-[10px]">CORPORATE SECURITY LICENSE</span>
            <div className="text-white font-bold">SpectraSense Defense Edition v1.0.0</div>
            <div className="text-emerald-400 text-[11px]">AUTHENTICATED RIG ID: SIH-26147-CORP-SEC</div>
          </div>
        </div>
      </div>
    </div>
  );
};
