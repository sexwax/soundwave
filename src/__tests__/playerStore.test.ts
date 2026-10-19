import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../modules/player/store/playerStore';
import type { LocalTrack } from '../modules/favorites/db/favoritesDb';

function makeTrack(filePath: string, overrides: Partial<LocalTrack> = {}): LocalTrack {
  return {
    filePath,
    title: filePath,
    artist: 'Artist',
    album: 'Album',
    duration: 180,
    lastModified: 0,
    addedAt: new Date(),
    ...overrides,
  };
}

function makeTracks(count: number): LocalTrack[] {
  return Array.from({ length: count }, (_, i) => makeTrack(`track-${i}.mp3`));
}

const DEFAULT_STATE = {
  queue: [], shuffledQueue: [], currentIndex: 0, isPlaying: false,
  volume: 0.8, isMuted: false, balance: 0, repeatMode: 'none' as const,
  isShuffled: false, crossfadeDuration: 0, currentTime: 0, duration: 0, playTrigger: 0,
};

beforeEach(() => {
  localStorage.clear();
  usePlayerStore.setState(DEFAULT_STATE);
});

describe('playerStore — toggleShuffle', () => {
  it('keeps the current track playing when turned on', () => {
    const tracks = makeTracks(5);
    usePlayerStore.getState().setQueue(tracks, 2);
    const before = usePlayerStore.getState().currentTrack();

    usePlayerStore.getState().toggleShuffle();

    expect(usePlayerStore.getState().isShuffled).toBe(true);
    expect(usePlayerStore.getState().currentTrack()).toEqual(before);
  });

  it('keeps the current track playing when turned back off', () => {
    const tracks = makeTracks(5);
    usePlayerStore.getState().setQueue(tracks, 2);
    const before = usePlayerStore.getState().currentTrack();

    usePlayerStore.getState().toggleShuffle();
    usePlayerStore.getState().toggleShuffle();

    expect(usePlayerStore.getState().isShuffled).toBe(false);
    expect(usePlayerStore.getState().currentTrack()).toEqual(before);
  });
});

describe('playerStore — nextTrack', () => {
  it('repeat "none" stops at the end of the queue', () => {
    const tracks = makeTracks(3);
    usePlayerStore.getState().setQueue(tracks, 2);
    usePlayerStore.setState({ isPlaying: true, repeatMode: 'none' });

    usePlayerStore.getState().nextTrack();

    expect(usePlayerStore.getState().currentIndex).toBe(2);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('repeat "queue" wraps back to the first track', () => {
    const tracks = makeTracks(3);
    usePlayerStore.getState().setQueue(tracks, 2);
    usePlayerStore.setState({ repeatMode: 'queue' });

    usePlayerStore.getState().nextTrack();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it('repeat "track" restarts the same track via playTrigger', () => {
    const tracks = makeTracks(3);
    usePlayerStore.getState().setQueue(tracks, 1);
    usePlayerStore.setState({ repeatMode: 'track' });
    const triggerBefore = usePlayerStore.getState().playTrigger;

    usePlayerStore.getState().nextTrack();

    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(usePlayerStore.getState().playTrigger).toBe(triggerBefore + 1);
  });

  it('a single-track queue with repeat "queue" restarts via playTrigger instead of looping', () => {
    usePlayerStore.getState().setQueue(makeTracks(1), 0);
    usePlayerStore.setState({ repeatMode: 'queue' });
    const triggerBefore = usePlayerStore.getState().playTrigger;

    usePlayerStore.getState().nextTrack();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
    expect(usePlayerStore.getState().playTrigger).toBe(triggerBefore + 1);
  });
});

describe('playerStore — prevTrack at index 0', () => {
  it('without repeat "queue": restarts the current track via playTrigger', () => {
    usePlayerStore.getState().setQueue(makeTracks(3), 0);
    usePlayerStore.setState({ repeatMode: 'none' });
    const triggerBefore = usePlayerStore.getState().playTrigger;

    usePlayerStore.getState().prevTrack();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
    expect(usePlayerStore.getState().playTrigger).toBe(triggerBefore + 1);
  });

  it('with repeat "queue": wraps to the last track', () => {
    usePlayerStore.getState().setQueue(makeTracks(3), 0);
    usePlayerStore.setState({ repeatMode: 'queue' });

    usePlayerStore.getState().prevTrack();

    expect(usePlayerStore.getState().currentIndex).toBe(2);
  });
});

describe('playerStore — appendToQueue', () => {
  it('works with an empty queue', () => {
    const tracks = makeTracks(2);
    usePlayerStore.getState().appendToQueue(tracks);

    expect(usePlayerStore.getState().queue).toHaveLength(2);
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it('does not duplicate tracks already in the queue', () => {
    const initial = makeTracks(2);
    usePlayerStore.getState().setQueue(initial, 0);

    const overlapping = [initial[0], makeTrack('track-2.mp3')];
    usePlayerStore.getState().appendToQueue(overlapping);

    const paths = usePlayerStore.getState().queue.map((t) => t.filePath);
    expect(paths).toEqual(['track-0.mp3', 'track-1.mp3', 'track-2.mp3']);
  });
});

describe('playerStore — playIndex', () => {
  it('restarts (bumps playTrigger) when clicking the already-current track', () => {
    usePlayerStore.getState().setQueue(makeTracks(3), 1);
    const triggerBefore = usePlayerStore.getState().playTrigger;

    usePlayerStore.getState().playIndex(1);

    expect(usePlayerStore.getState().playTrigger).toBe(triggerBefore + 1);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('switches track without touching playTrigger when clicking a different one', () => {
    usePlayerStore.getState().setQueue(makeTracks(3), 0);
    const triggerBefore = usePlayerStore.getState().playTrigger;

    usePlayerStore.getState().playIndex(2);

    expect(usePlayerStore.getState().currentIndex).toBe(2);
    expect(usePlayerStore.getState().playTrigger).toBe(triggerBefore);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});

describe('playerStore — persistence', () => {
  it('partialize only persists user preferences, not the queue/playback state', () => {
    usePlayerStore.getState().setQueue(makeTracks(3), 1);
    usePlayerStore.setState({ isPlaying: true, currentTime: 42 });
    usePlayerStore.getState().setVolume(0.42);
    usePlayerStore.getState().setMuted(true);
    usePlayerStore.getState().setRepeatMode('track');
    usePlayerStore.getState().setCrossfade(5);

    const raw = localStorage.getItem('soundwave-player');
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw!).state;

    expect(persisted).toEqual({
      volume: 0.42,
      isMuted: true,
      repeatMode: 'track',
      crossfadeDuration: 5,
    });
  });
});
