import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../../modules/player/store/playerStore';
import { useRadioStore } from '../../../modules/radio/store/radioStore';
import { usePlaybackStore } from '../../audio/playbackCoordinator';
import { useShallow } from 'zustand/react/shallow';
import { formatTime } from '../../utils/formatters';

export function MiniPlayer() {
  const {
    volume, setVolume, isMuted, toggleMute, setMuted,
    currentTime, duration,
  } = usePlayerStore(
    useShallow((s) => ({
      volume: s.volume, setVolume: s.setVolume, isMuted: s.isMuted, toggleMute: s.toggleMute, setMuted: s.setMuted,
      currentTime: s.currentTime, duration: s.duration,
    })),
  );
  const playerTrack = usePlayerStore((s) => s.currentTrack());
  const radioStation = useRadioStore((s) => s.currentStation);
  const activeSource = usePlaybackStore((s) => s.active);
  const navigate = useNavigate();

  // Trust the coordinator's active source; fall back to "radio if a station is
  // loaded and no local track is" only before anything has ever been claimed.
  const isRadio = activeSource ? activeSource === 'radio' : !!radioStation && !playerTrack;

  const title = isRadio ? (radioStation?.name ?? 'Sin reproducir') : (playerTrack?.title ?? 'Sin reproducir');
  const subtitle = isRadio ? (radioStation?.country ?? '') : (playerTrack?.artist ?? '');
  const artwork = isRadio ? radioStation?.favicon : playerTrack?.coverUrl;
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

      {/* Artwork + track info — clicking navigates to the active source's page */}
      <div
        onClick={() => navigate(isRadio ? '/radio' : '/')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate(isRadio ? '/radio' : '/')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
      >
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
          onChange={(e) => {
            const newVolume = Number(e.target.value);
            setVolume(newVolume);
            // Unmute when user manually adjusts volume
            if (newVolume > 0 && isMuted) {
              setMuted(false);
            }
          }}
          style={{ width: 60, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
          aria-label="Volumen"
        />
      </div>
    </footer>
  );
}
