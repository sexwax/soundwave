import { useEffect } from 'react';
import { usePlayerStore } from '../../modules/player/store/playerStore';
import { useRadioStore } from '../../modules/radio/store/radioStore';

export function useMediaSession() {
  const { nextTrack, prevTrack, setIsPlaying, isPlaying } = usePlayerStore();
  const playerTrack = usePlayerStore((s) => s.currentTrack());
  const radioStation = useRadioStore((s) => s.currentStation);

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

    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  }, [playerTrack, radioStation, isPlaying, nextTrack, prevTrack, setIsPlaying]);
}
