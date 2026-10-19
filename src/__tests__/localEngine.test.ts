import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { usePlayerStore } from '../modules/player/store/playerStore';
import * as localEngine from '../modules/player/services/localEngine';
import type { LocalTrack } from '../modules/favorites/db/favoritesDb';

function makeTrack(filePath: string): LocalTrack {
  return { filePath, title: filePath, artist: 'A', album: 'B', duration: 100, lastModified: 0, addedAt: new Date() };
}

// localEngine's <audio> element is a module-scope singleton created lazily —
// capture it by intercepting the global Audio constructor the first time
// localEngine creates one, so these tests can dispatch native events on it.
let el: HTMLAudioElement;

beforeAll(() => {
  const OriginalAudio = window.Audio;
  class CapturingAudio extends OriginalAudio {
    constructor(...args: ConstructorParameters<typeof OriginalAudio>) {
      super(...args);
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- capturing the instance localEngine creates is the point of this test double
      el = this;
    }
  }
  window.Audio = CapturingAudio;

  localEngine.seek(0); // forces the lazy getElement() to run once
});

beforeEach(() => {
  usePlayerStore.setState({
    queue: [], shuffledQueue: [], currentIndex: 0, isPlaying: false,
    isShuffled: false, repeatMode: 'none', currentTime: 0, duration: 0, playTrigger: 0,
  });
});

describe('localEngine — native <audio> event wiring', () => {
  it('"ended" advances to the next track', () => {
    usePlayerStore.getState().setQueue([makeTrack('a.mp3'), makeTrack('b.mp3')], 0);

    el.dispatchEvent(new Event('ended'));

    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it('"pause" while el.ended is true does not clear isPlaying (it is about to advance)', () => {
    usePlayerStore.setState({ isPlaying: true });
    Object.defineProperty(el, 'ended', { value: true, configurable: true });

    el.dispatchEvent(new Event('pause'));

    expect(usePlayerStore.getState().isPlaying).toBe(true);

    Object.defineProperty(el, 'ended', { value: false, configurable: true });
  });

  it('"pause" while el.ended is false does clear isPlaying', () => {
    usePlayerStore.setState({ isPlaying: true });

    el.dispatchEvent(new Event('pause'));

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

describe('localEngine — previous()', () => {
  it('seeks to 0 when more than 3s into the track', () => {
    usePlayerStore.getState().setQueue([makeTrack('a.mp3'), makeTrack('b.mp3')], 1);
    el.currentTime = 10;

    localEngine.previous();

    expect(el.currentTime).toBe(0);
    expect(usePlayerStore.getState().currentTime).toBe(0);
    expect(usePlayerStore.getState().currentIndex).toBe(1); // stayed on the same track
  });

  it('goes to the previous track when 3s or less into the track', () => {
    usePlayerStore.getState().setQueue([makeTrack('a.mp3'), makeTrack('b.mp3')], 1);
    el.currentTime = 1;

    localEngine.previous();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });
});
