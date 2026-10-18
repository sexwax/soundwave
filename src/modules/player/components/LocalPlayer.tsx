import { useLocalFiles } from '../hooks/useLocalFiles';
import { usePlayerStore } from '../store/playerStore';
import { useShallow } from 'zustand/react/shallow';
import * as localEngine from '../services/localEngine';
import { TrackList } from './TrackList';
import { Equalizer } from './Equalizer';
import { FileTree } from './FileTree';
import { Button } from '../../../shared/components/ui/Button';
import { Slider } from '../../../shared/components/ui/Slider';
import { Visualizer } from '../../../shared/components/audio/Visualizer';
import { useState } from 'react';
import { formatTime } from '../../../shared/utils/formatters';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

export function LocalPlayer() {
  const { openDirectory, openFiles, isIndexing } = useLocalFiles();
  const {
    queue, isShuffled, toggleShuffle, crossfadeDuration, setCrossfade,
    setCurrentIndex, setIsPlaying,
    currentTime, duration,
    volume, setVolume, isMuted, toggleMute,
    currentTrack, isPlaying,
  } = usePlayerStore(useShallow((s) => ({
    queue: s.queue, isShuffled: s.isShuffled, toggleShuffle: s.toggleShuffle,
    crossfadeDuration: s.crossfadeDuration, setCrossfade: s.setCrossfade,
    setCurrentIndex: s.setCurrentIndex, setIsPlaying: s.setIsPlaying,
    currentTime: s.currentTime, duration: s.duration,
    volume: s.volume, setVolume: s.setVolume, isMuted: s.isMuted, toggleMute: s.toggleMute,
    currentTrack: s.currentTrack, isPlaying: s.isPlaying,
  })));
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
                onChange={(e) => localEngine.seek(Number(e.target.value))}
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

            {/* Volume Control */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="sm"
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                style={{ minWidth: 32 }}
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

            {/* Transport Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8,
            }}>
              <Button
                onClick={localEngine.previous}
                variant="ghost"
                size="sm"
                aria-label="Anterior"
                style={{ minWidth: 40, fontSize: 18 }}
              >
                ⏮
              </Button>
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                variant="primary"
                size="sm"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                style={{ minWidth: 48, height: 48, borderRadius: '50%', fontSize: 18 }}
              >
                {isPlaying ? '⏸' : '▶'}
              </Button>
              <Button
                onClick={localEngine.next}
                variant="ghost"
                size="sm"
                aria-label="Siguiente"
                style={{ minWidth: 40, fontSize: 18 }}
              >
                ⏭
              </Button>
            </div>
          </div>

          {/* Right: Visualizer */}
          <div style={{
            width: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <Visualizer width={200} height={80} mode={visMode} />
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                onClick={() => setVisMode('bars')}
                variant={visMode === 'bars' ? 'primary' : 'ghost'}
                size="sm"
                style={{ fontSize: 10, padding: '2px 6px' }}
              >
                ▌▌▌
              </Button>
              <Button
                onClick={() => setVisMode('wave')}
                variant={visMode === 'wave' ? 'primary' : 'ghost'}
                size="sm"
                style={{ fontSize: 10, padding: '2px 6px' }}
              >
                〜〜
              </Button>
              <Button
                onClick={() => setVisMode('circular')}
                variant={visMode === 'circular' ? 'primary' : 'ghost'}
                size="sm"
                style={{ fontSize: 10, padding: '2px 6px' }}
              >
                ◎
              </Button>
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
