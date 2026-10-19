import { describe, it, expect, beforeEach } from 'vitest';
import { useEqStore, EQ_PRESETS, effectiveGains } from '../shared/audio/eqStore';

const FLAT_GAINS = [...EQ_PRESETS.Flat];

beforeEach(() => {
  localStorage.clear();
  useEqStore.setState({ enabled: true, gains: [...FLAT_GAINS], preset: 'Flat', panelOpen: false });
});

describe('eqStore — panel UI state', () => {
  it('togglePanel alternates panelOpen', () => {
    expect(useEqStore.getState().panelOpen).toBe(false);
    useEqStore.getState().togglePanel();
    expect(useEqStore.getState().panelOpen).toBe(true);
    useEqStore.getState().togglePanel();
    expect(useEqStore.getState().panelOpen).toBe(false);
  });

  it('does not persist panelOpen', () => {
    useEqStore.getState().togglePanel();
    expect(useEqStore.getState().panelOpen).toBe(true);

    const raw = localStorage.getItem('soundwave-eq');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state).not.toHaveProperty('panelOpen');
    // The fields the EQ actually needs to survive a reload are still there.
    expect(parsed.state).toHaveProperty('enabled');
    expect(parsed.state).toHaveProperty('gains');
    expect(parsed.state).toHaveProperty('preset');
  });
});

describe('eqStore — presets', () => {
  it('applyPreset sets gains and preset name', () => {
    useEqStore.getState().applyPreset('Bass Boost');

    expect(useEqStore.getState().preset).toBe('Bass Boost');
    expect(useEqStore.getState().gains).toEqual(EQ_PRESETS['Bass Boost']);
  });

  it('applyPreset with an unknown name is a no-op', () => {
    const before = useEqStore.getState();
    useEqStore.getState().applyPreset('Not A Real Preset');

    expect(useEqStore.getState().preset).toBe(before.preset);
    expect(useEqStore.getState().gains).toEqual(before.gains);
  });
});

describe('eqStore — setGain', () => {
  it('switches the preset label to "Custom"', () => {
    useEqStore.getState().applyPreset('Rock');
    useEqStore.getState().setGain(0, 3.5);

    expect(useEqStore.getState().preset).toBe('Custom');
    expect(useEqStore.getState().gains[0]).toBe(3.5);
    // Only the touched band changes — the rest of the Rock preset survives.
    expect(useEqStore.getState().gains.slice(1)).toEqual(EQ_PRESETS.Rock.slice(1));
  });
});

describe('effectiveGains', () => {
  it('returns the real gains when the EQ is enabled', () => {
    const state = { enabled: true, gains: EQ_PRESETS['Treble Boost'] };
    expect(effectiveGains(state)).toEqual(EQ_PRESETS['Treble Boost']);
  });

  it('returns all zeros when the EQ is bypassed, without mutating the stored gains', () => {
    const gains = EQ_PRESETS['Treble Boost'];
    const state = { enabled: false, gains };

    expect(effectiveGains(state)).toEqual(gains.map(() => 0));
    expect(gains).toEqual(EQ_PRESETS['Treble Boost']); // untouched
  });
});
