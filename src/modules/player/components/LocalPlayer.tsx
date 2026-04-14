import { useLocalFiles } from '../hooks/useLocalFiles';
import { usePlayerStore } from '../store/playerStore';
import { TrackList } from './TrackList';
import { Equalizer } from './Equalizer';
import { Button } from '../../../shared/components/ui/Button';
import { Visualizer } from '../../../shared/components/audio/Visualizer';
import { Slider } from '../../../shared/components/ui/Slider';
import { useState } from 'react';

export function LocalPlayer() {
  const { openDirectory, openFiles, isIndexing } = useLocalFiles();
  const { queue, isShuffled, toggleShuffle, crossfadeDuration, setCrossfade } = usePlayerStore();
  const [showEq, setShowEq] = useState(false);
  const [visMode, setVisMode] = useState<'bars' | 'wave' | 'circular'>('bars');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button onClick={openDirectory} disabled={isIndexing}>
          📁 {isIndexing ? 'Indexando...' : 'Abrir carpeta'}
        </Button>
        <Button onClick={openFiles} variant="outline">
          🎵 Abrir archivos
        </Button>
        <Button
          onClick={toggleShuffle}
          variant={isShuffled ? 'primary' : 'ghost'}
          size="sm"
          aria-label="Aleatorio"
        >
          🔀 Aleatorio
        </Button>
        <Button
          onClick={() => setShowEq(!showEq)}
          variant={showEq ? 'primary' : 'ghost'}
          size="sm"
        >
          🎚️ EQ
        </Button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {['bars', 'wave', 'circular'].map((m) => (
            <Button
              key={m}
              onClick={() => setVisMode(m as 'bars' | 'wave' | 'circular')}
              variant={visMode === m ? 'primary' : 'ghost'}
              size="sm"
            >
              {m === 'bars' ? '▌▌▌' : m === 'wave' ? '〜' : '◎'}
            </Button>
          ))}
        </div>
      </div>

      {/* Visualizer */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, overflow: 'hidden', padding: 4 }}>
        <Visualizer width={800} height={120} mode={visMode} />
      </div>

      {/* EQ */}
      {showEq && <Equalizer />}

      {/* Crossfade */}
      <Slider
        label={`Crossfade: ${crossfadeDuration}s`}
        min={0} max={12} step={1}
        value={crossfadeDuration}
        onChange={(e) => setCrossfade(Number(e.target.value))}
        style={{ maxWidth: 280 }}
      />

      {/* Info bar */}
      {queue.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {queue.length} pistas en cola
        </div>
      )}

      {/* Track list */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {queue.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 200, color: 'var(--text-disabled)', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>🎵</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
              Abre una carpeta o archivos de audio para comenzar
            </p>
            <p style={{ fontSize: 12 }}>
              Formatos: MP3, FLAC, WAV, OGG, OPUS, AAC, M4A
            </p>
            {!('showDirectoryPicker' in window) && (
              <p style={{ color: 'var(--accent-warning)', fontSize: 12, textAlign: 'center', maxWidth: 400 }}>
                ⚠️ Tu navegador no soporta acceso a carpetas. Usa Chrome o Edge para esta función.
              </p>
            )}
          </div>
        ) : (
          <TrackList />
        )}
      </div>
    </div>
  );
}
