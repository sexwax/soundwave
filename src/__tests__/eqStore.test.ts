import { describe, it, expect, beforeEach } from 'vitest';
import { useEqStore } from '../shared/audio/eqStore';

describe('eqStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useEqStore.setState({ panelOpen: false });
  });

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
