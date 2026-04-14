import { useRef, useEffect } from 'react';

interface VUMeterProps {
  level: number; // 0-1
  width?: number;
  height?: number;
}

export function VUMeter({ level, width = 300, height = 24 }: VUMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bars = 20;
    const barW = canvas.width / bars - 2;

    for (let i = 0; i < bars; i++) {
      const threshold = i / bars;
      const active = threshold < level;
      const color = threshold > 0.85
        ? 'var(--accent-danger)'
        : threshold > 0.65
        ? 'var(--accent-warning)'
        : 'var(--accent-success)';
      ctx.fillStyle = active ? color : 'var(--bg-elevated)';
      ctx.fillRect(i * (barW + 2), 0, barW, canvas.height);
    }
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', borderRadius: 4 }}
      aria-label={`Nivel de audio: ${Math.round(level * 100)}%`}
    />
  );
}
