import { useEffect } from 'react';
import { usePlayerStore, selectCurrentTrack } from '../store/playerStore';
import { useEqStore, effectiveGains } from '../../../shared/audio/eqStore';
import { setEqGains } from '../../../shared/audio/audioGraph';
import * as localEngine from '../services/localEngine';

/**
 * Bridges playerStore/eqStore ↔ localEngine. Mounts exactly once (in AppInner)
 * so navigating between pages never re-initialises playback. Reads via
 * `store.subscribe`, never `usePlayerStore()`, so it never triggers a render.
 */
export function useAudioEngine(): void {
  useEffect(() => {
    const initial = usePlayerStore.getState();
    localEngine.applyVolume(initial.volume, initial.isMuted);
    setEqGains(effectiveGains(useEqStore.getState()));

    const unsubscribePlayer = usePlayerStore.subscribe((state, prev) => {
      const track = selectCurrentTrack(state);
      const prevTrack = selectCurrentTrack(prev);
      const trackChanged = track?.filePath !== prevTrack?.filePath || state.playTrigger !== prev.playTrigger;

      if (trackChanged) {
        if (track) {
          localEngine.load(track);
          if (state.isPlaying) void localEngine.play();
        }
      } else if (state.isPlaying !== prev.isPlaying) {
        if (state.isPlaying) void localEngine.play();
        else localEngine.pause();
      }

      if (state.volume !== prev.volume || state.isMuted !== prev.isMuted) {
        localEngine.applyVolume(state.volume, state.isMuted);
      }
    });

    const unsubscribeEq = useEqStore.subscribe((state) => {
      setEqGains(effectiveGains(state));
    });

    return () => {
      unsubscribePlayer();
      unsubscribeEq();
    };
  }, []);
}
