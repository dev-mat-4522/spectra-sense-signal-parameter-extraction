import React, { useRef, useEffect, useState } from 'react';
import { Activity, Waves, Sliders, Maximize2, RefreshCw, Eye } from 'lucide-react';
import { SignalSample, BackendResult } from '../types';

interface VisualizationsViewProps {
  activeSignal: SignalSample;
  analysisResult?: BackendResult | null;
}

export const VisualizationsView: React.FC<VisualizationsViewProps> = ({ activeSignal, analysisResult }) => {
  const waterfallRef = useRef<HTMLCanvasElement | null>(null);
  const psdRef = useRef<HTMLCanvasElement | null>(null);
  const [colorMap, setColorMap] = useState<'emerald' | 'amber' | 'cyan'>('emerald');
  const [fftRate, setFftRate] = useState(40);

  // Waterfall Spectrogram Canvas
  useEffect(() => {
    const canvas = waterfallRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#0B110E';
    ctx.fillRect(0, 0, width, height);

    if (analysisResult?.visual?.waterfall && analysisResult.visual.waterfall.length > 0) {
      const waterfall = analysisResult.visual.waterfall;
      const rows = waterfall.length;
      const cols = waterfall[0].length;
      
      const imgData = ctx.createImageData(cols, rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = waterfall[r][c]; // usually in dB, e.g. -120 to 0
          // normalize val from -100 to 0 -> 0 to 255
          const intensity = Math.max(0, Math.min(255, (val + 100) * (255 / 100)));
          const pixelIndex = (r * cols + c) * 4;
          if (colorMap === 'emerald') {
            imgData.data[pixelIndex] = Math.floor(intensity * 0.1);     // R
            imgData.data[pixelIndex + 1] = Math.floor(intensity * 0.95); // G
            imgData.data[pixelIndex + 2] = Math.floor(intensity * 0.45); // B
          } else if (colorMap === 'cyan') {
            imgData.data[pixelIndex] = Math.floor(intensity * 0.05);
            imgData.data[pixelIndex + 1] = Math.floor(intensity * 0.8);
            imgData.data[pixelIndex + 2] = Math.floor(intensity * 0.95);
          } else {
            // Tactical Amber
            imgData.data[pixelIndex] = Math.floor(intensity * 0.95);
            imgData.data[pixelIndex + 1] = Math.floor(intensity * 0.65);
            imgData.data[pixelIndex + 2] = Math.floor(intensity * 0.1);
          }
          imgData.data[pixelIndex + 3] = 255; // Alpha
        }
      }
      
      // We need to draw this onto a temporary canvas, then scale it to our main canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cols;
      tempCanvas.height = rows;
      tempCanvas.getContext('2d')?.putImageData(imgData, 0, 0);
      
      // disable image smoothing for crispy pixels
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    } else {
      // Fallback text if no data
      ctx.fillStyle = '#4B705E';
      ctx.font = '12px JetBrains Mono';
      ctx.fillText('NO REALTIME DATA', width/2 - 50, height/2);
    }
  }, [colorMap, analysisResult]);

  // Power Spectral Density Canvas
  useEffect(() => {
    const canvas = psdRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#080E0B';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#14241C';
    ctx.lineWidth = 1;
    for (let y = 20; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (analysisResult?.visual?.psd && analysisResult.visual.psd.length > 0) {
      const psd = analysisResult.visual.psd;
      const numPoints = psd.length;

      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#34D399';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      
      ctx.moveTo(35, height);

      let maxVal = -Infinity;
      for (let i = 0; i < numPoints; i++) {
        const val = psd[i]; // dB values
        if (val > maxVal) maxVal = val;
        
        // normalize: assume max is 0 dB, min is -100 dB
        const normY = Math.max(0, Math.min(1, (val + 100) / 100));
        const y = height - (normY * (height - 20));
        
        const x = 35 + (i / (numPoints - 1)) * (width - 35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const center = width / 2;
      ctx.fillStyle = '#10B981';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`CARRIER PEAK: ${maxVal.toFixed(1)} dB`, center - 50, 24);
    } else {
      ctx.fillStyle = '#4B705E';
      ctx.font = '12px JetBrains Mono';
      ctx.fillText('NO REALTIME DATA', width/2 - 50, height/2);
    }
  }, [analysisResult]);

  return (
    <div id="visualizations-container" className="p-6 space-y-6 max-w-[1600px] mx-auto select-none">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#16251E] gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Waves className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold font-display uppercase tracking-tight text-white">
              ADVANCED RF SPECTROGRAM & WATERFALL
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time FFT frequency binning, time-lapse waterfall energy matrix, and carrier power spectrum density.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-[#0E1613] p-1 rounded-lg border border-[#1A2E24] text-xs font-mono">
            <span className="px-2 text-slate-500">PALETTE:</span>
            {(['emerald', 'cyan', 'amber'] as const).map((pal) => (
              <button
                key={pal}
                onClick={() => setColorMap(pal)}
                className={`px-2 py-1 rounded capitalize ${
                  colorMap === pal
                    ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Waterfall & PSD Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waterfall Spectrogram */}
        <div className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-[#16251E]">
            <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>2D WATERFALL (TIME VS FREQUENCY)</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400/90">2048-PT FFT</span>
          </div>

          <div className="mt-4 relative rounded-lg overflow-hidden border border-[#172B21] bg-[#080E0B] h-[340px]">
            <canvas
              ref={waterfallRef}
              width={640}
              height={340}
              className="w-full h-full block"
            />
            {/* Frequency Axis Markings */}
            <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
              <span>{analysisResult ? `-${(analysisResult.params.sampling_rate_hz / 2000).toFixed(1)} kHz` : '-62.5 kHz'}</span>
              <span className="text-emerald-400 font-bold">
                {analysisResult 
                  ? (analysisResult.params.cfo_hz !== 0 
                      ? `Fc ${analysisResult.params.cfo_hz > 0 ? '+' : ''}${analysisResult.params.cfo_hz.toFixed(1)} Hz` 
                      : 'Fc (Baseband)') 
                  : `Fc (${activeSignal.frequency.split(' ')[0]})`}
              </span>
              <span>{analysisResult ? `+${(analysisResult.params.sampling_rate_hz / 2000).toFixed(1)} kHz` : '+62.5 kHz'}</span>
            </div>
          </div>
        </div>

        {/* Power Spectral Density */}
        <div className="rounded-xl bg-[#0B120F] border border-[#162720] p-5 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-[#16251E]">
            <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>POWER SPECTRAL DENSITY (PSD)</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400/90">dBm / Hz</span>
          </div>

          <div className="mt-4 relative rounded-lg overflow-hidden border border-[#172B21] bg-[#080E0B] h-[340px]">
            <canvas
              ref={psdRef}
              width={640}
              height={340}
              className="w-full h-full block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
