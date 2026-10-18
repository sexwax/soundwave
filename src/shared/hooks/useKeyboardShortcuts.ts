import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../../modules/player/store/playerStore';
import { useRadioStore } from '../../modules/radio/store/radioStore';
import * as localEngine from '../../modules/player/services/localEngine';

const SEEK_STEP_SECONDS = 10;

export function useKeyboardShortcuts() {
  const { isPlaying, setIsPlaying, toggleMute, nextTrack, prevTrack } = usePlayerStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying, setIsPlaying: s.setIsPlaying, toggleMute: s.toggleMute,
      nextTrack: s.nextTrack, prevTrack: s.prevTrack,
    })),
  );
  const { isPlaying: radioIsPlaying, setIsPlaying: setRadioIsPlaying } = useRadioStore(
    useShallow((s) => ({ isPlaying: s.isPlaying, setIsPlaying: s.setIsPlaying })),
  );
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
            if (isLocalActive) localEngine.seekBy(-SEEK_STEP_SECONDS);
          } else {
            // Previous track only for local player
            if (isLocalActive) prevTrack();
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            // Seek forward only for local player
            if (isLocalActive) localEngine.seekBy(SEEK_STEP_SECONDS);
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
  }, [isPlaying, radioIsPlaying, isRadioActive, isLocalActive, setIsPlaying, setRadioIsPlaying, toggleMute, nextTrack, prevTrack]);
}
