import { createContext, useContext, useRef, useEffect, useCallback, useState, type ReactNode } from 'react';

interface AudioContextValue {
  audioContext: AudioContext | null;
  masterGainNode: GainNode | null;
  analyserNode: AnalyserNode | null;
  eqNodes: BiquadFilterNode[];
  connectMediaElement: (el: HTMLMediaElement) => Promise<void>;
}

const AudioCtx = createContext<AudioContextValue>({
  audioContext: null,
  masterGainNode: null,
  analyserNode: null,
  eqNodes: [],
  connectMediaElement: async () => {},
});

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  // WeakMap tracks source nodes per audio element — Howler reuses elements from an
  // internal pool and createMediaElementSource() can only be called once per element.
  const sourceNodeMapRef = useRef(new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>());

  // Triggers a re-render once the AudioContext and all nodes are ready,
  // so context consumers receive non-null values.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.8;
    masterGainRef.current = master;

    // EQ chain
    const eqNodes = EQ_FREQUENCIES.map((freq) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });
    eqNodesRef.current = eqNodes;

    // Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    // Chain: master -> eq[0] -> ... -> analyser -> destination
    master.connect(eqNodes[0]);
    for (let i = 0; i < eqNodes.length - 1; i++) {
      eqNodes[i].connect(eqNodes[i + 1]);
    }
    eqNodes[eqNodes.length - 1].connect(analyser);
    analyser.connect(ctx.destination);

    // Re-render so consumers receive the real node references.
    setReady(true);

    return () => {
      ctx.close();
    };
  }, []);

  const connectMediaElement = useCallback(async (el: HTMLMediaElement) => {
    const ctx = audioContextRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    // Disconnect the previous source from the graph (but keep the node alive in the WeakMap).
    if (mediaSourceRef.current) {
      try { mediaSourceRef.current.disconnect(); } catch { /* already disconnected */ }
    }

    // Browsers suspend AudioContext until user interaction. Resume before connecting
    // so audio actually flows through the chain.
    if (ctx.state !== 'running') {
      await ctx.resume();
    }

    // Reuse existing source node for this element if available.
    // createMediaElementSource() throws if called twice on the same element.
    let source = sourceNodeMapRef.current.get(el);
    if (!source) {
      source = ctx.createMediaElementSource(el);
      sourceNodeMapRef.current.set(el, source);
    }

    source.connect(master);
    mediaSourceRef.current = source;
  }, []);

  return (
    <AudioCtx.Provider
      value={{
        audioContext: ready ? audioContextRef.current : null,
        masterGainNode: ready ? masterGainRef.current : null,
        analyserNode: ready ? analyserRef.current : null,
        eqNodes: ready ? eqNodesRef.current : [],
        connectMediaElement,
      }}
    >
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudioContext() {
  return useContext(AudioCtx);
}
