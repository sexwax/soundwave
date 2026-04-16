import { usePlayerStore } from '../../../modules/player/store/playerStore';
import { useRadioStore } from '../../../modules/radio/store/radioStore';
import { formatTime } from '../../utils/audioUtils';

export function MiniPlayer() {
  const {
    volume, setVolume, isMuted, toggleMute,
    currentTime, duration,
  } = usePlayerStore();
  const playerTrack = usePlayerStore((s) => s.currentTrack());
  const radioStation = useRadioStore((s) => s.currentStation);

  const title = playerTrack?.title ?? radioStation?.name ?? 'Sin reproducir';
  const subtitle = playerTrack?.artist ?? radioStation?.country ?? '';
  const artwork = playerTrack?.coverUrl ?? radioStation?.favicon;
  const isRadio = !playerTrack && !!radioStation;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer
      style={{
        height: 'var(--player-height)',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 12,
        flexShrink: 0,
        position: 'relative',
      }}
      className="miniplayer"
    >
      {/* Progress bar */}
      {!isRadio && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 2,
            background: 'var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--accent-primary)',
              transition: 'width 0.5s linear',
            }}
          />
        </div>
      )}

      {/* Artwork */}
      <div
        style={{
          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
          background: 'var(--bg-elevated)',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {artwork ? (
          <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 18 }}>{isRadio ? '📻' : '🎵'}</span>
        )}
      </div>

      {/* Track info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span className={title.length > 20 ? 'marquee-text' : ''}>{title}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
          {subtitle}
          {!isRadio && duration > 0 && (
            <span style={{ marginLeft: 8, color: 'var(--text-disabled)' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Right side controls - Volume only */}
      <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {/* Mute */}
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        {/* Volume */}
        <input
          type="range" min={0} max={1} step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{ width: 60, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          aria-label="Volumen"
        />
      </div>
    </footer>
  );
}
