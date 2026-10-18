import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../modules/player/store/playerStore';
import { useRadioStore, isRadioPlaying } from '../../modules/radio/store/radioStore';
import { usePlaybackStore, getActiveSource } from '../../shared/audio/playbackCoordinator';
import { resumeRadio, pauseRadio } from '../../modules/radio/services/radioPlayer';
import * as localEngine from '../../modules/player/services/localEngine';

const SEEK_STEP_SECONDS = 10;

export function useMediaSession() {
  const activeSource = usePlaybackStore((s) => s.active);
  const { isPlaying, nextTrack, prevTrack, setIsPlaying } = usePlayerStore(
    useShallow((s) => ({ isPlaying: s.isPlaying, nextTrack: s.nextTrack, prevTrack: s.prevTrack, setIsPlaying: s.setIsPlaying })),
  );
  const playerTrack = usePlayerStore((s) => s.currentTrack());
  const radioStation = useRadioStore((s) => s.currentStation);
  const radioPlaying = useRadioStore(isRadioPlaying);

  const isRadioActive = activeSource === 'radio';

  // Metadata, playback state and action handlers — these only change when the
  // track/station/active source changes, never on every `timeupdate` tick.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const title = isRadioActive ? (radioStation?.name ?? 'SoundWave') : (playerTrack?.title ?? 'SoundWave');
    const artist = isRadioActive ? (radioStation?.country ?? '') : (playerTrack?.artist ?? '');
    const album = isRadioActive ? '' : (playerTrack?.album ?? '');
    const artwork = isRadioActive ? radioStation?.favicon : playerTrack?.coverUrl;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: artwork ? [{ src: artwork, sizes: '512x512' }] : [],
    });

    navigator.mediaSession.playbackState = (isRadioActive ? radioPlaying : isPlaying) ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => {
      if (isRadioActive) resumeRadio();
      else setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isRadioActive) pauseRadio();
      else setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', isRadioActive ? null : () => prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', isRadioActive ? null : () => nextTrack());

    // Seeking a live stream doesn't mean anything — only local tracks get these.
    if (isRadioActive) {
      navigator.mediaSession.setActionHandler('seekto', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    } else {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) localEngine.seek(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => localEngine.seekBy(-SEEK_STEP_SECONDS));
      navigator.mediaSession.setActionHandler('seekforward', () => localEngine.seekBy(SEEK_STEP_SECONDS));
    }

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [isRadioActive, playerTrack, radioStation, radioPlaying, isPlaying, nextTrack, prevTrack, setIsPlaying]);

  // Position updates are high-frequency (every `timeupdate`) — sync via a plain
  // store subscription instead of a selector, so this never re-renders the app.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

    return usePlayerStore.subscribe((s, prev) => {
      if (getActiveSource() === 'radio') return;
      if (s.currentTime === prev.currentTime && s.duration === prev.duration) return;
      if (s.duration <= 0) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: s.duration,
          playbackRate: 1,
          position: Math.min(s.currentTime, s.duration),
        });
      } catch {
        // Some browsers throw if duration/position are inconsistent mid-seek — safe to ignore.
      }
    });
  }, []);
}
