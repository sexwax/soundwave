import { useEffect } from 'react';
import { usePlayerStore } from '../../modules/player/store/playerStore';

export function useKeyboardShortcuts() {
  const { isPlaying, setIsPlaying, toggleMute, nextTrack, prevTrack, currentTime, setCurrentTime } =
    usePlayerStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowLeft':
          if (e.shiftKey) { setCurrentTime(Math.max(0, currentTime - 10)); }
          else { prevTrack(); }
          break;
        case 'ArrowRight':
          if (e.shiftKey) { setCurrentTime(currentTime + 10); }
          else { nextTrack(); }
          break;
        case 'KeyM':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, currentTime, setIsPlaying, toggleMute, nextTrack, prevTrack, setCurrentTime]);
}
