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

interface RadioState {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isLoading: boolean;
  status: 'idle' | 'connecting' | 'playing' | 'error' | 'offline';
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
  setIsPlaying: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setStatus: (v: RadioState['status']) => void;
  setSearchQuery: (q: string) => void;
  updateFilter: <K extends keyof RadioState['filters']>(key: K, value: RadioState['filters'][K]) => void;
}

export const useRadioStore = create<RadioState>((set) => ({
  stations: [],
  currentStation: null,
  isPlaying: false,
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
  setIsPlaying: (v) => set({ isPlaying: v }),
  setIsLoading: (v) => set({ isLoading: v }),
  setStatus: (v) => set({ status: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  updateFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
}));
