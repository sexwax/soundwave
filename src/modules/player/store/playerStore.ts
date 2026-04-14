import { create } from 'zustand';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

export type RepeatMode = 'none' | 'track' | 'queue';

interface PlayerState {
  queue: LocalTrack[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  balance: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  shuffledQueue: LocalTrack[];
  crossfadeDuration: number;
  currentTime: number;
  duration: number;
  playTrigger: number;
  setQueue: (tracks: LocalTrack[], startIndex?: number) => void;
  setCurrentIndex: (index: number) => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
  setBalance: (v: number) => void;
  setRepeatMode: (v: RepeatMode) => void;
  toggleShuffle: () => void;
  setCrossfade: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  currentTrack: () => LocalTrack | null;
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  volume: 0.8,
  isMuted: false,
  balance: 0,
  repeatMode: 'none',
  isShuffled: false,
  shuffledQueue: [],
  crossfadeDuration: 0,
  currentTime: 0,
  duration: 0,
  playTrigger: 0,

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: startIndex, shuffledQueue: fisherYates(tracks) }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setMuted: (v) => set({ isMuted: v }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setBalance: (v) => set({ balance: v }),
  setRepeatMode: (v) => set({ repeatMode: v }),
  toggleShuffle: () =>
    set((s) => ({ isShuffled: !s.isShuffled, shuffledQueue: fisherYates(s.queue) })),
  setCrossfade: (v) => set({ crossfadeDuration: v }),
  setCurrentTime: (v) => set({ currentTime: v }),
  setDuration: (v) => set({ duration: v }),

  nextTrack: () => {
    const { queue, currentIndex, repeatMode } = get();
    if (repeatMode === 'track') {
      set((s) => ({ playTrigger: s.playTrigger + 1 }));
      return;
    }
    if (currentIndex < queue.length - 1) set({ currentIndex: currentIndex + 1 });
    else if (repeatMode === 'queue') set({ currentIndex: 0 });
    else set({ isPlaying: false });
  },

  prevTrack: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
  },

  currentTrack: () => {
    const { queue, shuffledQueue, currentIndex, isShuffled } = get();
    const active = isShuffled && shuffledQueue.length === queue.length ? shuffledQueue : queue;
    return active[currentIndex] ?? null;
  },
}));
