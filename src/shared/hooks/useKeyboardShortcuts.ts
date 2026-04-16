import { useEffect } from 'react';
import { usePlayerStore } from '../../modules/player/store/playerStore';
import { useRadioStore } from '../../modules/radio/store/radioStore';

export function useKeyboardShortcuts() {
  const { isPlaying, setIsPlaying, toggleMute, nextTrack, prevTrack, currentTime, setCurrentTime } =
    usePlayerStore();
  const { isPlaying: radioIsPlaying, setIsPlaying: setRadioIsPlaying } = useRadioStore();
  const playerTrack = usePlayerStore((s) => s.currentTrack());
  const radioStation = useRadioStore((s) => s.currentStation);

  // Determine which player is active
  const isRadioActive = !!radioStation;
  const isLocalActive = !!playerTrack && !isRadioActive;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isRadioActive) {
            setRadioIsPlaying(!radioIsPlaying);
          } else {
            setIsPlaying(!isPlaying);
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            // Seek backward only for local player
            if (isLocalActive) setCurrentTime(Math.max(0, currentTime - 10));
          } else {
            // Previous track only for local player
            if (isLocalActive) prevTrack();
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            // Seek forward only for local player
            if (isLocalActive) setCurrentTime(currentTime + 10);
          } else {
            // Next track only for local player
            if (isLocalActive) nextTrack();
          }
          break;
        case 'KeyM':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, radioIsPlaying, isRadioActive, isLocalActive, currentTime, setIsPlaying, setRadioIsPlaying, toggleMute, nextTrack, prevTrack, setCurrentTime]);
}
