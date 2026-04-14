import { useState } from 'react';
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
  const { eqNodes } = useAudioContext();
  const [activePreset, setActivePreset] = useState<string>('Flat');
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const applyPreset = (name: string, values: number[]) => {
    values.forEach((gain, i) => {
      if (eqNodes[i]) eqNodes[i].gain.value = gain;
    });
    setActivePreset(name);
    setGains([...values]);
  };

  const setGain = (index: number, value: number) => {
    // eslint-disable-next-line react-compiler/react-compiler
    if (eqNodes[index]) eqNodes[index].gain.value = value;
    setGains((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setActivePreset('Custom');
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)', borderRadius: 12, padding: 16,
      border: '1px solid var(--border-subtle)',
    }}>
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
      <div style={{ display: 'flex', gap: 8 }}>
        {BANDS.map((freq, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <input
              type="range"
              min={-12} max={12} step={0.5}
              value={gains[i]}
              style={{ height: 80, accentColor: 'var(--accent-primary)', writingMode: 'vertical-lr', direction: 'rtl', cursor: 'pointer', WebkitAppearance: 'slider-vertical' } as any}
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
  );
}
