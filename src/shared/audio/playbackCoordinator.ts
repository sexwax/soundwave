import { create } from 'zustand';

/**
 * Ensures only one audio source plays at a time and tracks which one the user
 * used last (drives MiniPlayer, keyboard shortcuts and Media Session).
 */
export type PlaybackSource = 'local' | 'radio';

interface PlaybackState {
  active: PlaybackSource | null;
}

export const usePlaybackStore = create<PlaybackState>(() => ({ active: null }));

const stoppers = new Map<PlaybackSource, () => void>();

export function registerPlaybackSource(source: PlaybackSource, stop: () => void): void {
  stoppers.set(source, stop);
}

/** Marks `source` as active and stops every other registered source. */
export function claimPlayback(source: PlaybackSource): void {
  for (const [name, stop] of stoppers) {
    if (name !== source) stop();
  }
  if (usePlaybackStore.getState().active !== source) {
    usePlaybackStore.setState({ active: source });
  }
}

export function getActiveSource(): PlaybackSource | null {
  return usePlaybackStore.getState().active;
}
