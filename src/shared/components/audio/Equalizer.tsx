import type { CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEqStore, EQ_PRESETS, EQ_BAND_LABELS } from '../../audio/eqStore';
import { usePlaybackStore } from '../../audio/playbackCoordinator';
import { useRadioStore } from '../../../modules/radio/store/radioStore';
import { Button } from '../ui/Button';
import { Visualizer } from './Visualizer';

const SLIDER_STYLE: CSSProperties = {
  height: 100,
  accentColor: 'var(--accent-primary)',
  writingMode: 'vertical-lr',
  direction: 'rtl',
  cursor: 'pointer',
  WebkitAppearance: 'slider-vertical',
};

export function Equalizer() {
  const { enabled, gains, preset, setGain, applyPreset, setEnabled } = useEqStore(
    useShallow((s) => ({
      enabled: s.enabled, gains: s.gains, preset: s.preset,
      setGain: s.setGain, applyPreset: s.applyPreset, setEnabled: s.setEnabled,
    })),
  );
  const activeSource = usePlaybackStore((s) => s.active);
  const radioRouted = useRadioStore((s) => s.routed);
  const showCorsWarning = activeSource === 'radio' && !radioRouted;

  const handleReset = () => {
    applyPreset('Flat');
    setEnabled(true);
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 12,
      padding: 16,
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      opacity: enabled ? 1 : 0.5,
    }}>
      {showCorsWarning && (
        <div style={{
          fontSize: 12, color: 'var(--accent-warning)',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 8, padding: '8px 12px',
        }}>
          ⚠️ Esta emisora no admite ecualizador (el servidor no permite CORS). Los ajustes se aplicarán a la próxima fuente compatible.
        </div>
      )}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Controles del ecualizador */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14 }}>Ecualizador</h4>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Button
                variant={enabled ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setEnabled(!enabled)}
                aria-pressed={enabled}
              >
                {enabled ? '🔊 EQ activado' : '🔈 EQ desactivado'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                ↺ Reset
              </Button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.keys(EQ_PRESETS).map((name) => (
              <Button
                key={name}
                variant={preset === name ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => applyPreset(name)}
              >
                {name}
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {EQ_BAND_LABELS.map((label, i) => (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={gains[i]}
                  disabled={!enabled}
                  style={SLIDER_STYLE}
                  onChange={(e) => setGain(i, Number(e.target.value))}
                  aria-label={`Banda ${label}Hz`}
                />
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {label}
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
          gap: 8,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-secondary)' }}>
            Espectro
          </div>
          <Visualizer mode="bars" width={150} height={150} />
        </div>
      </div>
    </div>
  );
}
