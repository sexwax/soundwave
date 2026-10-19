import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  usePlaybackStore,
  registerPlaybackSource,
  claimPlayback,
  getActiveSource,
} from '../shared/audio/playbackCoordinator';

beforeEach(() => {
  usePlaybackStore.setState({ active: null });
});

describe('playbackCoordinator — claimPlayback', () => {
  it('stops every other registered source and updates the active source', () => {
    const stopLocal = vi.fn();
    const stopRadio = vi.fn();
    registerPlaybackSource('local', stopLocal);
    registerPlaybackSource('radio', stopRadio);

    claimPlayback('local');

    expect(stopRadio).toHaveBeenCalledTimes(1);
    expect(stopLocal).not.toHaveBeenCalled();
    expect(getActiveSource()).toBe('local');

    claimPlayback('radio');

    expect(stopLocal).toHaveBeenCalledTimes(1);
    expect(stopRadio).toHaveBeenCalledTimes(1); // not called a second time
    expect(getActiveSource()).toBe('radio');
  });

  it('re-claiming the already-active source is a no-op on the store', () => {
    registerPlaybackSource('local', vi.fn());
    claimPlayback('local');
    const stateBefore = usePlaybackStore.getState();

    claimPlayback('local');

    expect(usePlaybackStore.getState()).toBe(stateBefore);
  });
});
