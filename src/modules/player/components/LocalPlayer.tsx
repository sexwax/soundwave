import { useLocalFiles } from '../hooks/useLocalFiles';
import { usePlayerStore } from '../store/playerStore';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { TrackList } from './TrackList';
import { Equalizer } from './Equalizer';
import { FileTree } from './FileTree';
import { Button } from '../../../shared/components/ui/Button';
import { Visualizer } from '../../../shared/components/audio/Visualizer';
import { Slider } from '../../../shared/components/ui/Slider';
import { useState } from 'react';
import { formatTime } from '../../../shared/utils/formatters';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

export function LocalPlayer() {
  const { openDirectory, openFiles, isIndexing } = useLocalFiles();
  const { seek } = useAudioEngine();
  const {
    queue, isShuffled, toggleShuffle, crossfadeDuration, setCrossfade,
    isPlaying, setIsPlaying, nextTrack, prevTrack, setCurrentIndex,
    currentTime, duration,
    volume, setVolume, isMuted, toggleMute,
    currentTrack
  } = usePlayerStore();
  const track = currentTrack();
  const [showEq, setShowEq] = useState(false);
  const [visMode, setVisMode] = useState<'bars' | 'wave' | 'circular'>('bars');

  const handleSelectTrack = (selectedTrack: LocalTrack) => {
    const index = queue.findIndex(t => t.filePath === selectedTrack.filePath);
    if (index >= 0) {
      setCurrentIndex(index);
      setIsPlaying(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Toolbar */}
      <div className="player-toolbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button onClick={openDirectory} disabled={isIndexing} className="toolbar-btn">
          📁 {isIndexing ? 'Indexando...' : 'Abrir carpeta'}
        </Button>
        <Button onClick={openFiles} variant="outline" className="toolbar-btn">
          🎵 Abrir archivos
        </Button>
        <Button
          onClick={toggleShuffle}
          variant={isShuffled ? 'primary' : 'ghost'}
          size="sm"
          aria-label="Aleatorio"
          className="toolbar-btn"
        >
          🔀 Aleatorio
        </Button>
        <Button
          onClick={() => setShowEq(!showEq)}
          variant={showEq ? 'primary' : 'ghost'}
          size="sm"
          className="toolbar-btn"
        >
          🎚️ EQ
        </Button>
      </div>

      {/* Playback Controls Panel - Controls on left, Visualizer on right */}
      {queue.length > 0 && (
        <div className="playback-controls-panel" style={{
          background: 'var(--bg-elevated)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          gap: 16,
          alignItems: 'stretch',
        }}>
          {/* Left: Controls */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {/* Now Playing Info */}
            {track && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                borderRadius: 8,
              }}>
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={track.album}
                    style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48,
                    background: 'var(--accent-primary)',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    🎵
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {track.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}>
                    {track.artist}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: 4,
                  background: 'transparent',
                  borderRadius: 2,
                  cursor: 'pointer',
                  accentColor: 'var(--accent-primary)',
                }}
                className="progress-slider"
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 40 }}>
                {formatTime(duration)}
              </span>
            </div>

            {/* Main Controls - Prev, Play/Pause, Next */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 12,
              paddingTop: 8,
            }}>
              {/* Previous */}
              <Button
                onClick={prevTrack}
                variant="ghost"
                size="sm"
                aria-label="Anterior"
                style={{ width: 44, height: 44, borderRadius: '50%' }}
              >
                ⏮
              </Button>

              {/* Play/Pause */}
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                variant="primary"
                size="sm"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                style={{ width: 56, height: 56, borderRadius: '50%', fontSize: 24 }}
              >
                {isPlaying ? '⏸' : '▶'}
              </Button>

              {/* Next */}
              <Button
                onClick={nextTrack}
                variant="ghost"
                size="sm"
                aria-label="Siguiente"
                style={{ width: 44, height: 44, borderRadius: '50%' }}
              >
                ⏭
              </Button>

              {/* Volume Control - inline */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginLeft: 12,
                flex: 1,
              }}>
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="sm"
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                  style={{ minWidth: 32, width: 36, height: 36, borderRadius: '50%' }}
                >
                  {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: 4,
                    background: 'var(--bg-surface)',
                    borderRadius: 2,
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                  className="volume-slider"
                />
              </div>
            </div>
          </div>

          {/* Right: Visualizer */}
          <div style={{
            width: 200,
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
              textAlign: 'center',
            }}>
              Visualizador
            </div>
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}>
              <Visualizer width={180} height={140} mode={visMode} />
            </div>
            {/* Mode selector buttons below visualizer */}
            <div style={{
              display: 'flex',
              gap: 4,
              marginTop: 8,
            }}>
              {['bars', 'wave', 'circular'].map((m) => (
                <Button
                  key={m}
                  onClick={() => setVisMode(m as 'bars' | 'wave' | 'circular')}
                  variant={visMode === m ? 'primary' : 'ghost'}
                  size="sm"
                  style={{ padding: '2px 8px', fontSize: 10 }}
                >
                  {m === 'bars' ? '▌▌' : m === 'wave' ? '〜' : '◎'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {/* Track list with header */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                🎼 Lista de reproducción ({queue.length} pistas)
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <TrackList />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
