import type HlsType from 'hls.js';
import { useRadioStore, type RadioStation } from '../store/radioStore';
import { radioBrowserApi } from './radioBrowserApi';
import { usePlayerStore } from '../../player/store/playerStore';
import { useFavoritesStore } from '../../favorites/store/favoritesStore';
import { resumeAudio, routeThroughGraph } from '../../../shared/audio/audioGraph';
import { claimPlayback, registerPlaybackSource } from '../../../shared/audio/playbackCoordinator';
import { notify } from '../../../shared/utils/notify';
import { proxify } from '../../../shared/utils/corsProxy';

export interface StreamAttempt {
  url: string;
  el: 'cors' | 'plain';
  hls: boolean;
}

const STREAM_TIMEOUT_MS = 8000;
const STALLED_GRACE_MS = 10000;
const RECONNECT_DELAYS_MS = [1000, 2000, 4000];

function supportsNativeHls(): boolean {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('video');
  return probe.canPlayType('application/vnd.apple.mpegurl') !== '';
}

/** Pure, testable: the ordered list of stream attempts for a station. */
export function buildStreamAttempts(station: RadioStation, proxyUrl: string): StreamAttempt[] {
  const direct = station.url_resolved || station.url;
  if (!direct) return [];

  const candidates = proxyUrl
    ? Array.from(new Set([proxify(direct, proxyUrl), direct]))
    : [direct];

  const isHls = !!station.hls;
  const attempts: StreamAttempt[] = [];

  for (const url of candidates) {
    attempts.push({ url, el: 'cors', hls: isHls });
    if (!isHls) {
      attempts.push({ url, el: 'plain', hls: false });
    } else if (supportsNativeHls()) {
      attempts.push({ url, el: 'plain', hls: true });
    }
  }

  return attempts;
}

let corsEl: HTMLAudioElement | null = null;
let plainEl: HTMLAudioElement | null = null;
let activeEl: HTMLAudioElement | null = null;
let hls: HlsType | null = null;
let session = 0;
let current: RadioStation | null = null;
let reconnectAttempts = 0;

function currentBaseVolume(): number {
  const { volume, isMuted } = usePlayerStore.getState();
  return isMuted ? 0 : volume;
}

function applyVolumeToEl(node: HTMLAudioElement): void {
  node.volume = currentBaseVolume();
}

function applyVolumeToActive(): void {
  if (activeEl) applyVolumeToEl(activeEl);
}

function destroyHls(): void {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

function scheduleReconnect(): void {
  if (reconnectAttempts >= RECONNECT_DELAYS_MS.length) {
    useRadioStore.getState().setStatus('error');
    notify('Se perdió la conexión con la emisora.', 'error');
    return;
  }
  const delay = RECONNECT_DELAYS_MS[reconnectAttempts];
  reconnectAttempts++;
  useRadioStore.getState().setStatus('connecting');
  const stationToRetry = current;
  setTimeout(() => {
    if (stationToRetry && current === stationToRetry) {
      void playStation(stationToRetry);
    }
  }, delay);
}

function attachReconnectListeners(node: HTMLAudioElement): void {
  let stalledTimer: ReturnType<typeof setTimeout> | null = null;

  const clearStalledTimer = () => {
    if (stalledTimer !== null) {
      clearTimeout(stalledTimer);
      stalledTimer = null;
    }
  };

  const triggerReconnect = () => {
    if (node !== activeEl) return;
    if (useRadioStore.getState().status !== 'playing') return;
    scheduleReconnect();
  };

  node.addEventListener('error', triggerReconnect);
  node.addEventListener('ended', triggerReconnect);
  node.addEventListener('stalled', () => {
    clearStalledTimer();
    stalledTimer = setTimeout(triggerReconnect, STALLED_GRACE_MS);
  });
  node.addEventListener('playing', clearStalledTimer);
}

function getCorsEl(): HTMLAudioElement {
  if (!corsEl) {
    corsEl = new Audio();
    corsEl.crossOrigin = 'anonymous';
    corsEl.preload = 'none';
    attachReconnectListeners(corsEl);
  }
  return corsEl;
}

function getPlainEl(): HTMLAudioElement {
  if (!plainEl) {
    plainEl = new Audio();
    plainEl.preload = 'none';
    attachReconnectListeners(plainEl);
  }
  return plainEl;
}

async function tryHlsAttempt(node: HTMLAudioElement, url: string, mySession: number): Promise<boolean> {
  const { default: Hls } = await import('hls.js');
  if (mySession !== session) return false;
  if (!Hls.isSupported()) return false;

  destroyHls();
  const instance = new Hls();
  hls = instance;
  instance.loadSource(url);
  instance.attachMedia(node);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      instance.off(Hls.Events.ERROR, onHlsError);
      node.removeEventListener('playing', onPlaying);
      resolve(ok);
    };
    const onPlaying = () => { if (mySession === session) finish(true); };
    const onHlsError = (_event: unknown, data: { fatal: boolean }) => { if (data.fatal) finish(false); };
    const timer = setTimeout(() => finish(false), STREAM_TIMEOUT_MS);
    node.addEventListener('playing', onPlaying);
    instance.on(Hls.Events.ERROR, onHlsError);
    applyVolumeToEl(node);
    node.play().catch(() => finish(false));
  });
}

async function tryPlainAttempt(node: HTMLAudioElement, url: string, mySession: number): Promise<boolean> {
  node.src = url;
  node.load();

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      node.removeEventListener('playing', onPlaying);
      node.removeEventListener('error', onError);
      resolve(ok);
    };
    const onPlaying = () => { if (mySession === session) finish(true); };
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(false), STREAM_TIMEOUT_MS);
    node.addEventListener('playing', onPlaying);
    node.addEventListener('error', onError);
    applyVolumeToEl(node);
    node.play().catch(() => finish(false));
  });
}

async function tryAttempt(attempt: StreamAttempt, mySession: number): Promise<boolean> {
  const node = attempt.el === 'cors' ? getCorsEl() : getPlainEl();
  activeEl = node;

  await resumeAudio();
  const ok = attempt.hls && attempt.el === 'cors'
    ? await tryHlsAttempt(node, attempt.url, mySession)
    : await tryPlainAttempt(node, attempt.url, mySession);

  if (ok && attempt.el === 'cors') routeThroughGraph(node);
  return ok;
}

export async function playStation(station: RadioStation): Promise<void> {
  const mySession = ++session;
  current = station;
  claimPlayback('radio');
  useRadioStore.getState().setCurrentStation(station);
  useRadioStore.getState().setStatus('connecting');

  const proxyUrl = import.meta.env.VITE_CORS_PROXY_URL || '';
  const attempts = buildStreamAttempts(station, proxyUrl);

  if (attempts.length === 0) {
    if (mySession === session) {
      useRadioStore.getState().setStatus('error');
      notify('Esta emisora no tiene una URL válida.', 'error');
    }
    return;
  }

  for (const attempt of attempts) {
    if (mySession !== session) return; // superseded by a newer click
    const ok = await tryAttempt(attempt, mySession);
    if (mySession !== session) return;
    if (ok) {
      useRadioStore.getState().setStatus('playing');
      useRadioStore.getState().setRouted(attempt.el === 'cors');
      reconnectAttempts = 0;
      radioBrowserApi.registerClick(station.stationuuid);
      void useFavoritesStore.getState().addHistory({
        type: 'radio',
        title: station.name,
        artist: station.country,
        stationuuid: station.stationuuid,
      });
      return;
    }
  }

  if (mySession === session) {
    useRadioStore.getState().setStatus('error');
    notify(`No se pudo conectar con ${station.name}.`, 'error');
  }
}

/** Cuts the stream and marks the radio as paused. Resumable with `resumeRadio`. */
export function pauseRadio(): void {
  session++; // invalidate any in-flight connect/reconnect attempts
  destroyHls();
  if (activeEl) {
    activeEl.removeAttribute('src');
    activeEl.load();
  }
  useRadioStore.getState().setStatus('paused');
}

/** Re-plays the last station — reconnecting a live stream from where it fell off is meaningless. */
export function resumeRadio(): void {
  if (current) void playStation(current);
}

export function toggleRadio(): void {
  const status = useRadioStore.getState().status;
  if (status === 'playing' || status === 'connecting') pauseRadio();
  else resumeRadio();
}

/** Stops radio playback and resets radio store state. Safe to call when nothing is playing. */
export function stopRadio(): void {
  session++;
  destroyHls();
  if (activeEl) {
    activeEl.removeAttribute('src');
    activeEl.load();
  }
  reconnectAttempts = 0;
  useRadioStore.getState().setStatus('idle');
  useRadioStore.getState().setRouted(false);
}

usePlayerStore.subscribe((s, prev) => {
  if (s.volume !== prev.volume || s.isMuted !== prev.isMuted) applyVolumeToActive();
});

registerPlaybackSource('radio', stopRadio);
