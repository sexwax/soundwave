import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const EQ_BAND_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  Vocal: [-2, -2, 0, 2, 4, 4, 3, 1, 0, -1],
  Rock: [6, 4, 2, 0, -2, 0, 2, 4, 4, 4],
  Jazz: [4, 2, 0, 2, -2, -2, 0, 2, 4, 4],
  Pop: [-2, -1, 2, 4, 4, 3, 1, -1, -2, -2],
  Classical: [4, 4, 2, 0, -2, -2, 0, 2, 4, 4],
};

interface EqState {
  enabled: boolean;
  gains: number[];
  preset: string;
  setGain: (index: number, value: number) => void;
  applyPreset: (name: string) => void;
  setEnabled: (v: boolean) => void;
}

export const useEqStore = create<EqState>()(
  persist(
    (set) => ({
      enabled: true,
      gains: [...EQ_PRESETS.Flat],
      preset: 'Flat',
      setGain: (index, value) =>
        set((s) => {
          const gains = [...s.gains];
          gains[index] = value;
          return { gains, preset: 'Custom' };
        }),
      applyPreset: (name) => {
        const values = EQ_PRESETS[name];
        if (values) set({ gains: [...values], preset: name });
      },
      setEnabled: (v) => set({ enabled: v }),
    }),
    { name: 'soundwave-eq', version: 1 },
  ),
);

/** Gains actually sent to the filters (all zero when the EQ is bypassed). */
export function effectiveGains(s: Pick<EqState, 'enabled' | 'gains'>): number[] {
  return s.enabled ? s.gains : s.gains.map(() => 0);
}
