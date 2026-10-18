import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../modules/player/store/playerStore';
import { useRadioStore, isRadioPlaying } from '../../modules/radio/store/radioStore';
import { resumeRadio, pauseRadio } from '../../modules/radio/services/radioPlayer';

export function useMediaSession() {
  const { nextTrack, prevTrack, setIsPlaying, isPlaying } = usePlayerStore(
    useShallow((s) => ({ nextTrack: s.nextTrack, prevTrack: s.prevTrack, setIsPlaying: s.setIsPlaying, isPlaying: s.isPlaying })),
  );
  const playerTrack = usePlayerStore((s) => s.currentTrack());
  const radioStation = useRadioStore((s) => s.currentStation);
  const radioIsPlaying = useRadioStore(isRadioPlaying);

  // Determine which player is active
  const isRadioActive = !!radioStation;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const title = playerTrack?.title ?? radioStation?.name ?? 'SoundWave';
    const artist = playerTrack?.artist ?? radioStation?.country ?? '';
    const artwork = playerTrack?.coverUrl ?? radioStation?.favicon;

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: playerTrack?.album ?? '',
      artwork: artwork ? [{ src: artwork, sizes: '512x512' }] : [],
    });

    // Use correct player based on what's active
    navigator.mediaSession.setActionHandler('play', () => {
      if (isRadioActive) {
        resumeRadio();
      } else {
        setIsPlaying(true);
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isRadioActive) {
        pauseRadio();
      } else {
        setIsPlaying(false);
      }
    });
    // Previous/next only for local player
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (!isRadioActive) prevTrack();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (!isRadioActive) nextTrack();
    });
  }, [playerTrack, radioStation, isRadioActive, isPlaying, radioIsPlaying, nextTrack, prevTrack, setIsPlaying]);
}
