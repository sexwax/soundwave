import { create } from 'zustand';

export type RecorderSource = 'app' | 'tab' | 'window';
export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'processing';

interface RecordingEntry {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  size: number;
  createdAt: Date;
  format: string;
}

interface RecorderState {
  status: RecorderStatus;
  source: RecorderSource;
  elapsed: number;
  level: number;
  recordings: RecordingEntry[];
  setStatus: (v: RecorderStatus) => void;
  setSource: (v: RecorderSource) => void;
  setElapsed: (v: number) => void;
  setLevel: (v: number) => void;
  addRecording: (r: RecordingEntry) => void;
  removeRecording: (id: string) => void;
}

export const useRecorderStore = create<RecorderState>((set) => ({
  status: 'idle',
  source: 'app',
  elapsed: 0,
  level: 0,
  recordings: [],
  setStatus: (v) => set({ status: v }),
  setSource: (v) => set({ source: v }),
  setElapsed: (v) => set({ elapsed: v }),
  setLevel: (v) => set({ level: v }),
  addRecording: (r) => set((s) => ({ recordings: [r, ...s.recordings] })),
  removeRecording: (id) => set((s) => ({ recordings: s.recordings.filter((r) => r.id !== id) })),
}));
