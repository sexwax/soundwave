import { usePlayerStore } from '../store/playerStore';
import type { LocalTrack } from '../../favorites/db/favoritesDb';
import { resumeAudio, routeThroughGraph } from '../../../shared/audio/audioGraph';
import { claimPlayback, registerPlaybackSource } from '../../../shared/audio/playbackCoordinator';
import { notify } from '../../../shared/utils/notify';

const CROSSFADE_TICK_MS = 100;
const RESTART_THRESHOLD_SECONDS = 3;
const ERROR_SKIP_DELAY_MS = 1000;

// Module-scope file registry: filePath → object URL.
const fileMap = new Map<string, string>();

export function registerFile(filePath: string, file: File): void {
  if (!fileMap.has(filePath)) {
    fileMap.set(filePath, URL.createObjectURL(file));
  }
}

export function getFileUrl(filePath: string): string | undefined {
  return fileMap.get(filePath);
}

/** Revokes object URLs for files no longer present in any queue. */
export function releaseFiles(keep: Set<string>): void {
  for (const [filePath, url] of fileMap) {
    if (!keep.has(filePath)) {
      URL.revokeObjectURL(url);
      fileMap.delete(filePath);
    }
  }
}

let el: HTMLAudioElement | null = null;
let crossfadeInterval: ReturnType<typeof setInterval> | null = null;
let baseVolume = 0.8;

function getElement(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
    attachListeners(el);
  }
  return el;
}

function effectiveVolume(t: number, dur: number, crossfadeDuration: number): number {
  if (crossfadeDuration <= 0 || dur <= 0) return baseVolume;
  const fadeIn = Math.min(1, t / crossfadeDuration);
  const fadeOut = Math.min(1, (dur - t) / crossfadeDuration);
  return baseVolume * Math.max(0, Math.min(1, fadeIn, fadeOut));
}

function startCrossfadeTicker(): void {
  stopCrossfadeTicker();
  crossfadeInterval = setInterval(() => {
    const node = el;
    if (!node) return;
    const { crossfadeDuration } = usePlayerStore.getState();
    node.volume = effectiveVolume(node.currentTime, node.duration, crossfadeDuration);
  }, CROSSFADE_TICK_MS);
}

function stopCrossfadeTicker(): void {
  if (crossfadeInterval !== null) {
    clearInterval(crossfadeInterval);
    crossfadeInterval = null;
  }
}

function attachListeners(node: HTMLAudioElement): void {
  node.addEventListener('loadedmetadata', () => {
    usePlayerStore.getState().setDuration(node.duration);
  });
  node.addEventListener('timeupdate', () => {
    usePlayerStore.getState().setCurrentTime(node.currentTime);
  });
  node.addEventListener('ended', () => {
    usePlayerStore.getState().nextTrack();
  });
  node.addEventListener('pause', () => {
    // `pause` fires right before `ended` on natural completion — ignore it there
    // so the automatic advance to the next track isn't immediately undone.
    if (!node.ended) usePlayerStore.getState().setIsPlaying(false);
  });
  node.addEventListener('play', () => {
    usePlayerStore.getState().setIsPlaying(true);
  });
  node.addEventListener('error', () => {
    notify('No se pudo reproducir la pista.', 'error');
    const { queue } = usePlayerStore.getState();
    if (queue.length > 1) {
      setTimeout(() => usePlayerStore.getState().nextTrack(), ERROR_SKIP_DELAY_MS);
    }
  });
}

export function load(track: LocalTrack): void {
  const url = getFileUrl(track.filePath);
  if (!url) {
    notify('Archivo no disponible, vuelve a abrir la carpeta', 'warning');
    return;
  }
  const node = getElement();
  node.src = url;
  usePlayerStore.getState().setCurrentTime(0);
  usePlayerStore.getState().setDuration(0);
}

export async function play(): Promise<void> {
  const node = getElement();
  claimPlayback('local');
  await resumeAudio();
  routeThroughGraph(node);
  const { crossfadeDuration } = usePlayerStore.getState();
  node.volume = crossfadeDuration > 0 && node.currentTime < crossfadeDuration
    ? 0
    : effectiveVolume(node.currentTime, node.duration, crossfadeDuration);
  startCrossfadeTicker();
  try {
    await node.play();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      usePlayerStore.getState().setIsPlaying(false);
    }
  }
}

export function pause(): void {
  stopCrossfadeTicker();
  if (el) el.pause();
}

export function seek(seconds: number): void {
  const node = getElement();
  node.currentTime = seconds;
  usePlayerStore.getState().setCurrentTime(seconds);
}

export function seekBy(delta: number): void {
  const node = getElement();
  seek(Math.max(0, Math.min(node.duration || Infinity, node.currentTime + delta)));
}

export function previous(): void {
  const node = getElement();
  if (node.currentTime > RESTART_THRESHOLD_SECONDS) {
    seek(0);
  } else {
    usePlayerStore.getState().prevTrack();
  }
}

export function next(): void {
  usePlayerStore.getState().nextTrack();
}

export function applyVolume(volume: number, isMuted: boolean): void {
  baseVolume = isMuted ? 0 : volume;
  if (el) {
    const { crossfadeDuration } = usePlayerStore.getState();
    el.volume = effectiveVolume(el.currentTime, el.duration, crossfadeDuration);
  }
}

registerPlaybackSource('local', () => {
  pause();
  usePlayerStore.getState().setIsPlaying(false);
});
