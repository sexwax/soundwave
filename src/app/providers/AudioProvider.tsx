import { useState, type ReactNode } from 'react';
import { getAudioGraph } from '../../shared/audio/audioGraph';
import { AudioCtx, type AudioContextValue } from './useAudioContext';

function buildAudioContextValue(): AudioContextValue {
  const graph = getAudioGraph();
  if (!graph) return { audioContext: null, masterGainNode: null, analyserNode: null, eqNodes: [] };
  return {
    audioContext: graph.ctx,
    masterGainNode: graph.master,
    analyserNode: graph.analyser,
    eqNodes: graph.eqNodes,
  };
}

export function AudioProvider({ children }: { children: ReactNode }) {
  // getAudioGraph() returns a module-level singleton — safe to call from a lazy
  // initializer: it never mutates React state and survives StrictMode's double
  // render/mount because the graph itself is created at most once.
  const [value] = useState<AudioContextValue>(buildAudioContextValue);

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}
