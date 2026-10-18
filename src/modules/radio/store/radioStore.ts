import { create } from 'zustand';

export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  country: string;
  countrycode: string;
  language: string;
  tags: string;
  bitrate: number;
  codec: string;
  votes: number;
  clickcount: number;
  hls: number;
  lastcheckok: number;
}

export type RadioStatus = 'idle' | 'connecting' | 'playing' | 'paused' | 'error';

interface RadioState {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  /** Whether the active stream is routed through the Web Audio graph (CORS-enabled). */
  routed: boolean;
  isLoading: boolean;
  status: RadioStatus;
  searchQuery: string;
  filters: {
    country: string;
    language: string;
    tags: string[];
    bitrateMin: number;
    codec: string;
    hidebroken: boolean;
    order: string;
  };
  setStations: (s: RadioStation[]) => void;
  setCurrentStation: (s: RadioStation | null) => void;
  setRouted: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setStatus: (v: RadioStatus) => void;
  setSearchQuery: (q: string) => void;
  updateFilter: <K extends keyof RadioState['filters']>(key: K, value: RadioState['filters'][K]) => void;
}

/** Derives the simple "is it audibly playing" flag that used to be stored directly. */
export function isRadioPlaying(s: Pick<RadioState, 'status'>): boolean {
  return s.status === 'playing';
}

export const useRadioStore = create<RadioState>((set) => ({
  stations: [],
  currentStation: null,
  routed: false,
  isLoading: false,
  status: 'idle',
  searchQuery: '',
  filters: {
    country: '',
    language: '',
    tags: [],
    bitrateMin: 0,
    codec: '',
    hidebroken: true,
    order: 'votes',
  },
  setStations: (s) => set({ stations: s }),
  setCurrentStation: (s) => set({ currentStation: s }),
  setRouted: (v) => set({ routed: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setStatus: (v) => set({ status: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  updateFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
}));
