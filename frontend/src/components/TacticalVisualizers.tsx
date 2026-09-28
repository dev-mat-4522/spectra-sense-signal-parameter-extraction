import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, ChevronDown, RefreshCw, ZoomIn, ZoomOut, Compass } from 'lucide-react';
import { WaveformChannel, ModulationType, BackendResult } from '../types';

interface WaveformProps {
  channel: WaveformChannel;
  onChangeChannel: (ch: WaveformChannel) => void;
  modulation: ModulationType;
  analysisResult?: any;
}

export const TimeDomainWaveformCanvas: React.FC<WaveformProps> = ({
  channel,
  onChangeChannel,
  modulation,
  analysisResult
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [gain, setGain] = useState(1.2);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark tactical background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      // Draw Oscilloscope Grid Lines
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;

      // Horizontal lines with dB tags
      const hSteps = 6;
      ctx.font = '9px JetBrains Mono';
      ctx.fillStyle = '#94A3B8';
      for (let i = 0; i <= hSteps; i++) {
        const y = (height / hSteps) * i;
        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        const dbVal = Math.round(15 - (i * 30) / hSteps);
        ctx.fillText(`${dbVal > 0 ? '+' : ''}${dbVal} dB`, 5, Math.min(height - 4, Math.max(10, y + 3)));
      }

      // Vertical grid lines
      const vSteps = 12;
      for (let i = 0; i <= vSteps; i++) {
        const x = 35 + ((width - 35) / vSteps) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Center Baseline
      const centerY = height / 2;
      ctx.strokeStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.moveTo(35, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Synthesize RF Waveform based on channel & modulation
      ctx.beginPath();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = channel === 'in-phase' ? '#34D399' : channel === 'quadrature' ? '#06B6D4' : '#10B981';

      const startX = 35;
      const plotWidth = width - startX;
      const points = 240;

      for (let i = 0; i < points; i++) {
        const x = startX + (i / (points - 1)) * plotWidth;
        const t = (i * 0.12) + offset;
        
        let val = 0;
        if (channel === 'in-phase') {
          val = Math.cos(t) * 0.7 + Math.sin(t * 2.3) * 0.25;
        } else if (channel === 'quadrature') {
          val = Math.sin(t) * 0.7 + Math.cos(t * 1.8) * 0.25;
        } else {
          // Combined I+Q Envelope with tactical RF noise
          const iComp = Math.cos(t) * 0.6;
          const qComp = Math.sin(t * 1.5) * 0.5;
          const noise = (Math.random() - 0.5) * 0.12;
          val = (iComp + qComp + noise) * 0.75;
        }

        const y = centerY - val * (height * 0.38) * gain;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Add a subtle glowing shadow under the wave
      ctx.save();
      ctx.shadowColor = '#3B82F6';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      if (isPlaying) {
        offset += 0.08;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [channel, isPlaying, gain, modulation]);

  return (
    <div id="card-time-domain-waveform" className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase">
              TIME DOMAIN WAVEFORM
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Real-time Oscilloscope Capture</span>
          </div>
        </div>

        {/* Channel Selector Dropdown */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono text-blue-600 hover:border-blue-500/50"
            >
              <span>{channel === 'combined' ? 'IQ (Combined)' : channel === 'in-phase' ? 'I (In-Phase)' : 'Q (Quadrature)'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-30 font-mono text-xs">
                {(['combined', 'in-phase', 'quadrature'] as WaveformChannel[]).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => {
                      onChangeChannel(ch);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-blue-50 ${
                      channel === ch ? 'text-blue-600 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    {ch === 'combined' ? 'IQ (Combined)' : ch === 'in-phase' ? 'I (In-Phase)' : 'Q (Quadrature)'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600"
            title={isPlaying ? 'Pause Sweep' : 'Resume Sweep'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 mt-3 min-h-[170px] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
        <canvas
          ref={canvasRef}
          width={560}
          height={210}
          className="w-full h-full block"
        />
        {/* Floating status tag */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-white/90 border border-slate-200 text-[9px] font-mono text-blue-600 font-bold">
          BANDWIDTH: {analysisResult ? (analysisResult.params.sampling_rate_hz / 1000).toFixed(1) + ' kHz' : '125 kHz'} • GAIN: {gain.toFixed(1)}x
        </div>
      </div>
    </div>
  );
};

interface ConstellationProps {
  modulation: ModulationType;
  analysisResult?: BackendResult | null;
}

export const ConstellationDiagramCanvas: React.FC<ConstellationProps> = ({
  modulation,
  analysisResult
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.36;

      // Dark tactical canvas background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid & Axes
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;

      // Coordinate Concentric Circles
      [0.33, 0.66, 1.0].forEach((rFactor) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, scale * rFactor, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Axis lines: I (Horizontal) & Q (Vertical)
      ctx.strokeStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.moveTo(15, centerY);
      ctx.lineTo(width - 15, centerY);
      ctx.moveTo(centerX, 15);
      ctx.lineTo(centerX, height - 15);
      ctx.stroke();

      // Axis labels
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('+Q', centerX + 6, 22);
      ctx.fillText('+I', width - 26, centerY - 6);
      ctx.fillText('-I', 8, centerY - 6);
      ctx.fillText('-Q', centerX + 6, height - 8);

      // Use real points if available, else don't render scatter
      if (analysisResult?.visual?.constellation && analysisResult.visual.constellation.length > 0) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
        for (const pt of analysisResult.visual.constellation) {
          const ptX = centerX + pt[0] * scale;
          const ptY = centerY - pt[1] * scale;
          ctx.beginPath();
          ctx.arc(ptX, ptY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [modulation, analysisResult]);

  return (
    <div id="card-constellation-diagram" className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-blue-500" />
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-slate-900 uppercase">
              CONSTELLATION DIAGRAM
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">I/Q Complex Phase Scatter</span>
          </div>
        </div>

        <div className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-mono text-blue-600 font-bold">
          {modulation} (M={modulation === '16-QAM' ? 16 : modulation === '8-PSK' ? 8 : 4})
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative flex-1 mt-3 min-h-[170px] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={210}
          className="w-full h-full block"
        />

        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-50/80 px-2 py-0.5 rounded border border-slate-200">
          POINTS: <span className="text-blue-600 font-bold">{analysisResult?.visual?.constellation?.length ?? 0}</span> • SNR: <span className="text-blue-600">N/A</span>
        </div>
      </div>
    </div>
  );
};
