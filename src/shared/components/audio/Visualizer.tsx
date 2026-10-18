import { useRef, useEffect, useState } from 'react';
import { useAudioContext } from '../../../app/providers/useAudioContext';

type VisMode = 'bars' | 'wave' | 'circular';

interface VisualizerProps {
  width?: number;
  height?: number;
  mode?: VisMode;
  compact?: boolean;
}

export function Visualizer({ width = 400, height = 80, mode = 'bars', compact = false }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { analyserNode } = useAudioContext();
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#00e5ff';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#7c3aed';

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mode === 'bars') {
        analyserNode.getByteFrequencyData(dataArray);
        const barCount = compact ? 32 : 64;
        const barWidth = canvas.width / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = dataArray[Math.floor((i * bufferLength) / barCount)];
          const barHeight = (val / 255) * canvas.height;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, accent);
          gradient.addColorStop(1, secondary);
          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth + 1, canvas.height - barHeight, barWidth - 2, barHeight);
        }
      } else if (mode === 'wave') {
        analyserNode.getByteTimeDomainData(dataArray);
        ctx.beginPath();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < bufferLength; i++) {
          const x = (i / bufferLength) * canvas.width;
          const y = (dataArray[i] / 128) * (canvas.height / 2);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (mode === 'circular') {
        analyserNode.getByteFrequencyData(dataArray);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = Math.min(cx, cy) - 10;
        for (let i = 0; i < 128; i++) {
          const angle = (i / 128) * Math.PI * 2;
          const val = (dataArray[i] / 255) * r * 0.5;
          const x1 = cx + Math.cos(angle) * r;
          const y1 = cy + Math.sin(angle) * r;
          const x2 = cx + Math.cos(angle) * (r + val);
          const y2 = cy + Math.sin(angle) * (r + val);
          ctx.beginPath();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.5;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    };

    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyserNode, mode, compact]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', borderRadius: 4 }}
      aria-hidden="true"
    />
  );
}
