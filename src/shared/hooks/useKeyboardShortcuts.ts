import { useEffect, useState } from 'react';
import { usePlayerStore } from '../../modules/player/store/playerStore';
import { getActiveSource } from '../../shared/audio/playbackCoordinator';
import { toggleRadio } from '../../modules/radio/services/radioPlayer';
import * as localEngine from '../../modules/player/services/localEngine';

const SEEK_STEP_SECONDS = 10;
const VOLUME_STEP = 0.05;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  return target.isContentEditable;
}

/**
 * Global shortcuts. Registers a single listener once (no reactive selectors —
 * everything is read fresh from getState()/getActiveSource() on each keydown)
 * so it never re-renders the app, unlike the old per-store-field subscriptions.
 */
export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      const player = usePlayerStore.getState();
      const activeSource = getActiveSource();

      switch (e.code) {
        case 'Space': {
          if (e.target instanceof HTMLElement && e.target.tagName === 'BUTTON') return;
          e.preventDefault();
          if (activeSource === 'radio') toggleRadio();
          else if (activeSource === 'local') player.setIsPlaying(!player.isPlaying);
          break;
        }
        case 'ArrowLeft':
          if (activeSource !== 'local') break;
          if (e.shiftKey) localEngine.seekBy(-SEEK_STEP_SECONDS);
          else player.prevTrack();
          break;
        case 'ArrowRight':
          if (activeSource !== 'local') break;
          if (e.shiftKey) localEngine.seekBy(SEEK_STEP_SECONDS);
          else player.nextTrack();
          break;
        case 'ArrowUp':
          e.preventDefault();
          player.setVolume(Math.min(1, player.volume + VOLUME_STEP));
          break;
        case 'ArrowDown':
          e.preventDefault();
          player.setVolume(Math.max(0, player.volume - VOLUME_STEP));
          break;
        case 'KeyM':
          player.toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { showHelp, closeHelp: () => setShowHelp(false) };
}
