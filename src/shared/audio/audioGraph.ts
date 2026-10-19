/**
 * Singleton Web Audio graph shared by the whole app.
 *
 *   source(s) → masterGain → eq[0..9] → analyser → destination
 *
 * It lives at module scope (not inside a React effect) so it is created exactly
 * once, survives StrictMode double-mounting and can be used from non-React
 * services (local engine, radio player, recorder).
 */

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  eqNodes: BiquadFilterNode[];
  analyser: AnalyserNode;
}

let graph: AudioGraph | null = null;

// createMediaElementSource() can only be called once per element, ever.
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export function isWebAudioSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

/** Returns the graph, creating it on first call. Returns null if Web Audio is unavailable. */
export function getAudioGraph(): AudioGraph | null {
  if (graph) return graph;
  if (!isWebAudioSupported()) return null;

  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 1;

  const eqNodes = EQ_FREQUENCIES.map((freq) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = 1.4;
    filter.gain.value = 0;
    return filter;
  });

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  master.connect(eqNodes[0]);
  for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
  eqNodes[eqNodes.length - 1].connect(analyser);
  analyser.connect(ctx.destination);

  graph = { ctx, master, eqNodes, analyser };
  return graph;
}

/**
 * Routes a media element through the graph (EQ + analyser).
 * WARNING: only route elements whose media is same-origin or CORS-enabled —
 * a tainted cross-origin source outputs silence once routed, and routing is permanent.
 */
export function routeThroughGraph(el: HTMLMediaElement): boolean {
  if (sources.has(el)) return true;
  const g = getAudioGraph();
  if (!g) return false;
  try {
    const src = g.ctx.createMediaElementSource(el);
    src.connect(g.master);
    sources.set(el, src);
    return true;
  } catch (err) {
    console.warn('[audioGraph] could not route element', err);
    return false;
  }
}

export function isRouted(el: HTMLMediaElement): boolean {
  return sources.has(el);
}

/** Browsers start the context suspended until a user gesture. Call this from play actions. */
export async function resumeAudio(): Promise<void> {
  const g = getAudioGraph();
  if (g && g.ctx.state !== 'running') {
    try { await g.ctx.resume(); } catch { /* ignore: will retry on next gesture */ }
  }
}

export function setEqGains(gains: readonly number[]): void {
  const g = getAudioGraph();
  if (!g) return;
  gains.forEach((gain, i) => {
    const node = g.eqNodes[i];
    if (node) node.gain.setTargetAtTime(gain, g.ctx.currentTime, 0.02);
  });
}
