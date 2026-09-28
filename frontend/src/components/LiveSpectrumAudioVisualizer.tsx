import React, { useEffect, useState } from 'react';

interface LiveSpectrumProps {
  barCount?: number;
  className?: string;
}

export const LiveSpectrumAudioVisualizer: React.FC<LiveSpectrumProps> = ({
  barCount = 28,
  className = '',
}) => {
  const [heights, setHeights] = useState<number[]>(() => 
    Array.from({ length: barCount }, (_, i) => {
      // Shape with center carriers
      const center = barCount / 2;
      const dist = Math.abs(i - center);
      const base = Math.max(12, 65 - dist * 3.5);
      return base + Math.sin(i * 0.8) * 15;
    })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map((val, idx) => {
          const center = barCount / 2;
          const dist = Math.abs(idx - center);
          // Target shaped around tactical RF peak
          const target = Math.max(10, 75 - dist * 4) + (Math.random() * 26 - 13);
          const next = val * 0.7 + target * 0.3;
          return Math.min(95, Math.max(8, next));
        })
      );
    }, 90);

    return () => clearInterval(interval);
  }, [barCount]);

  return (
    <div id="live-spectrum-analyzer" className={`flex flex-col items-end ${className}`}>
      {/* Bars container */}
      <div className="flex items-end space-x-1 h-12 px-2">
        {heights.map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-t-sm transition-all duration-75"
            style={{
              height: `${h}%`,
              backgroundColor: h > 60 ? '#3B82F6' : h > 30 ? '#2563EB' : '#1D4ED8',
              boxShadow: h > 70 ? '0 0 8px rgba(59, 130, 246, 0.4)' : 'none',
              opacity: 0.85 + (h / 200),
            }}
          />
        ))}
      </div>
      <div className="text-[10px] tracking-widest uppercase font-mono font-bold text-blue-600 mt-2 flex items-center space-x-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
        <span>LIVE SIGNAL ANALYSIS</span>
      </div>
    </div>
  );
};
