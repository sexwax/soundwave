import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

export type RepeatMode = 'none' | 'track' | 'queue';

interface PlayerState {
  /** Tracks in the order they were loaded. */
  queue: LocalTrack[];
  /** Play order while shuffle is on (same tracks as `queue`). */
  shuffledQueue: LocalTrack[];
  /** Index into the *active* list (shuffledQueue when shuffled, queue otherwise). */
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  balance: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  crossfadeDuration: number;
  currentTime: number;
  duration: number;
  /** Bumped to force the engine to (re)start the current track. */
  playTrigger: number;

  setQueue: (tracks: LocalTrack[], startIndex?: number) => void;
  appendToQueue: (tracks: LocalTrack[]) => void;
  clearQueue: () => void;
  setCurrentIndex: (index: number) => void;
  playIndex: (index: number) => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
  setBalance: (v: number) => void;
  setRepeatMode: (v: RepeatMode) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setCrossfade: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  currentTrack: () => LocalTrack | null;
}

export function fisherYates<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle keeping `first` (if any) at position 0 so the current song keeps playing. */
function shuffleWithFirst(tracks: readonly LocalTrack[], first: LocalTrack | null): LocalTrack[] {
  if (!first) return fisherYates(tracks);
  const rest = tracks.filter((t) => t.filePath !== first.filePath);
  return [first, ...fisherYates(rest)];
}

type ListState = Pick<PlayerState, 'queue' | 'shuffledQueue' | 'isShuffled' | 'currentIndex'>;

export function activeList(s: ListState): LocalTrack[] {
  return s.isShuffled && s.shuffledQueue.length === s.queue.length ? s.shuffledQueue : s.queue;
}

export function selectCurrentTrack(s: ListState): LocalTrack | null {
  return activeList(s)[s.currentIndex] ?? null;
}

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { none: 'queue', queue: 'track', track: 'none' };

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      shuffledQueue: [],
      currentIndex: 0,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      balance: 0,
      repeatMode: 'none',
      isShuffled: false,
      crossfadeDuration: 0,
      currentTime: 0,
      duration: 0,
      playTrigger: 0,

      setQueue: (tracks, startIndex = 0) => {
        const start = tracks[startIndex] ?? null;
        const { isShuffled } = get();
        set({
          queue: tracks,
          shuffledQueue: isShuffled ? shuffleWithFirst(tracks, start) : fisherYates(tracks),
          currentIndex: isShuffled ? 0 : startIndex,
          currentTime: 0,
          duration: 0,
        });
      },

      appendToQueue: (tracks) => {
        const { queue, shuffledQueue } = get();
        const known = new Set(queue.map((t) => t.filePath));
        const fresh = tracks.filter((t) => !known.has(t.filePath));
        if (fresh.length === 0) return;
        if (queue.length === 0) {
          get().setQueue(fresh, 0);
          return;
        }
        set({ queue: [...queue, ...fresh], shuffledQueue: [...shuffledQueue, ...fisherYates(fresh)] });
      },

      clearQueue: () =>
        set({ queue: [], shuffledQueue: [], currentIndex: 0, isPlaying: false, currentTime: 0, duration: 0 }),

      setCurrentIndex: (index) => set({ currentIndex: index }),

      playIndex: (index) => {
        const { currentIndex } = get();
        if (index === currentIndex) {
          // Clicking the current track restarts it.
          set((s) => ({ isPlaying: true, playTrigger: s.playTrigger + 1 }));
        } else {
          set({ currentIndex: index, isPlaying: true });
        }
      },

      setIsPlaying: (v) => set({ isPlaying: v }),
      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), ...(v > 0 ? { isMuted: false } : {}) }),
      setMuted: (v) => set({ isMuted: v }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setBalance: (v) => set({ balance: v }),
      setRepeatMode: (v) => set({ repeatMode: v }),
      cycleRepeatMode: () => set((s) => ({ repeatMode: REPEAT_CYCLE[s.repeatMode] })),

      toggleShuffle: () => {
        const s = get();
        const current = selectCurrentTrack(s);
        if (!s.isShuffled) {
          set({ isShuffled: true, shuffledQueue: shuffleWithFirst(s.queue, current), currentIndex: 0 });
        } else {
          const idx = current ? s.queue.findIndex((t) => t.filePath === current.filePath) : 0;
          set({ isShuffled: false, currentIndex: Math.max(0, idx) });
        }
      },

      setCrossfade: (v) => set({ crossfadeDuration: v }),
      setCurrentTime: (v) => set({ currentTime: v }),
      setDuration: (v) => set({ duration: v }),

      nextTrack: () => {
        const { currentIndex, repeatMode } = get();
        const len = activeList(get()).length;
        if (len === 0) return;
        if (repeatMode === 'track') {
          set((s) => ({ playTrigger: s.playTrigger + 1 }));
          return;
        }
        if (currentIndex < len - 1) set({ currentIndex: currentIndex + 1 });
        else if (repeatMode === 'queue') {
          // Same index when the queue has a single track → force restart.
          if (len === 1) set((s) => ({ playTrigger: s.playTrigger + 1 }));
          else set({ currentIndex: 0 });
        } else set({ isPlaying: false });
      },

      prevTrack: () => {
        const { currentIndex, repeatMode } = get();
        const len = activeList(get()).length;
        if (len === 0) return;
        if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
        else if (repeatMode === 'queue' && len > 1) set({ currentIndex: len - 1 });
        else set((s) => ({ playTrigger: s.playTrigger + 1 }));
      },

      currentTrack: () => selectCurrentTrack(get()),
    }),
    {
      name: 'soundwave-player',
      version: 1,
      // Only user preferences are persisted: local File objects can't survive a reload.
      partialize: (s) => ({
        volume: s.volume,
        isMuted: s.isMuted,
        repeatMode: s.repeatMode,
        crossfadeDuration: s.crossfadeDuration,
      }),
    },
  ),
);
