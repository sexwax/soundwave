import { createContext, useContext } from 'react';

export interface AudioContextValue {
  audioContext: AudioContext | null;
  masterGainNode: GainNode | null;
  analyserNode: AnalyserNode | null;
  eqNodes: BiquadFilterNode[];
}

export const AudioCtx = createContext<AudioContextValue>({
  audioContext: null,
  masterGainNode: null,
  analyserNode: null,
  eqNodes: [],
});

export function useAudioContext() {
  return useContext(AudioCtx);
}
