import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioContext } from '../../../app/providers/AudioProvider';
import { Button } from '../../../shared/components/ui/Button';

const BANDS = [32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  Rock: [6, 4, 2, 0, -2, 0, 2, 4, 4, 4],
  Jazz: [4, 2, 0, 2, -2, -2, 0, 2, 4, 4],
  Pop: [-2, -1, 2, 4, 4, 3, 1, -1, -2, -2],
  Classical: [4, 4, 2, 0, -2, -2, 0, 2, 4, 4],
};

export function Equalizer() {
  const { eqNodes, analyserNode } = useAudioContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [activePreset, setActivePreset] = useState<string>('Flat');
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isVisualizerRunning, setIsVisualizerRunning] = useState(false);

  // Apply gains safely with error handling
  const applyPreset = useCallback((name: string, values: number[]) => {
    try {
      values.forEach((gain, i) => {
        if (eqNodes && eqNodes[i]) {
          eqNodes[i].gain.value = gain;
        }
      });
      setActivePreset(name);
      setGains([...values]);
    } catch (err) {
      console.error('Error applying preset:', err);
    }
  }, [eqNodes]);

  const setGain = useCallback((index: number, value: number) => {
    try {
      if (eqNodes && eqNodes[index]) {
        eqNodes[index].gain.value = value;
      }
      setGains((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
      setActivePreset('Custom');
    } catch (err) {
      console.error('Error setting gain:', err);
    }
  }, [eqNodes]);

  // Visualizador de frecuencia en tiempo real
  useEffect(() => {
    // Solo iniciar si hay analyserNode y canvas
    if (!analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserNode;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let isRunning = true;

    const draw = () => {
      if (!isRunning) return;

      animationRef.current = requestAnimationFrame(draw);

      try {
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--bg-surface') || '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          gradient.addColorStop(0, getComputedStyle(canvas).getPropertyValue('--accent-primary') || '#6366f1');
          gradient.addColorStop(1, getComputedStyle(canvas).getPropertyValue('--accent-secondary') || '#8b5cf6');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      } catch (err) {
        // Silently handle errors to prevent crashes
        console.debug('Visualizer draw error:', err);
      }
    };

    draw();
    setIsVisualizerRunning(true);

    return () => {
      isRunning = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsVisualizerRunning(false);
    };
  }, [analyserNode]);

  // Show loading state if eqNodes are not ready
  if (!eqNodes || eqNodes.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}>
        <p>Cargando ecualizador...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 12,
      padding: 16,
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      gap: 16,
    }}>
      {/* Controles del ecualizador */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14 }}>Ecualizador</h4>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Object.entries(PRESETS).map(([name, values]) => (
              <Button
                key={name}
                variant={activePreset === name ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => applyPreset(name, values)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {BANDS.map((freq, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={gains[i]}
                style={{ height: 100, accentColor: 'var(--accent-primary)', writingMode: 'vertical-lr', direction: 'rtl', cursor: 'pointer', WebkitAppearance: 'slider-vertical' } as any}
                onChange={(e) => setGain(i, Number(e.target.value))}
                aria-label={`Banda ${freq}Hz`}
              />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {freq}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Visualizador de espectro */}
      <div style={{
        width: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginBottom: 8,
        }}>
          Espectro
        </div>
        <canvas
          ref={canvasRef}
          width={140}
          height={140}
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
          }}
        />
        {!isVisualizerRunning && (
          <div style={{
            fontSize: 10,
            color: 'var(--text-disabled)',
            marginTop: 4,
            textAlign: 'center',
          }}>
            Reproduce audio para ver el espectro
          </div>
        )}
      </div>
    </div>
  );
}
