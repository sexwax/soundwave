import { useRecorderStore, type RecorderSource } from '../store/recorderStore';
import { useRadioStore } from '../../radio/store/radioStore';
import { usePlaybackStore } from '../../../shared/audio/playbackCoordinator';
import { getAudioGraph } from '../../../shared/audio/audioGraph';
import { getSupportedMimeType, getFileExtFromMime } from '../../../shared/utils/audioUtils';
import { formatDate } from '../../../shared/utils/formatters';
import { notify } from '../../../shared/utils/notify';

const LEVEL_FFT_SIZE = 256;
const LEVEL_GAIN = 5;
const TIMER_TICK_MS = 1000;

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let stream: MediaStream | null = null;
let streamDest: MediaStreamAudioDestinationNode | null = null;
let levelAudioCtx: AudioContext | null = null;
let rafId: number | null = null;
let timerId: ReturnType<typeof setInterval> | null = null;

function startLevelMeter(mediaStream: MediaStream): void {
  const ctx = new AudioContext();
  levelAudioCtx = ctx;
  const src = ctx.createMediaStreamSource(mediaStream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = LEVEL_FFT_SIZE;
  src.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    let sumSq = 0;
    for (const v of data) {
      const n = (v / 128) - 1;
      sumSq += n * n;
    }
    useRecorderStore.getState().setLevel(Math.min(1, Math.sqrt(sumSq / data.length) * LEVEL_GAIN));
    rafId = requestAnimationFrame(tick);
  };
  tick();
}

function stopLevelMeter(): void {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  levelAudioCtx?.close();
  levelAudioCtx = null;
  useRecorderStore.getState().setLevel(0);
}

function startTimer(): void {
  stopTimer();
  timerId = setInterval(() => {
    useRecorderStore.getState().setElapsed(useRecorderStore.getState().elapsed + 1);
  }, TIMER_TICK_MS);
}

function stopTimer(): void {
  if (timerId !== null) clearInterval(timerId);
  timerId = null;
}

/** Whether "Esta app" can be recorded right now, with a user-facing reason if not. */
export function canRecordAppSource(): { ok: boolean; reason?: string } {
  const activeSource = usePlaybackStore.getState().active;
  if (activeSource === 'radio' && !useRadioStore.getState().routed) {
    return { ok: false, reason: 'Esta emisora no se puede grabar desde la app (sin CORS); usa el modo Pestaña.' };
  }
  return { ok: true };
}

async function captureAppStream(): Promise<MediaStream | null> {
  const check = canRecordAppSource();
  if (!check.ok) {
    notify(check.reason!, 'warning');
    return null;
  }
  const graph = getAudioGraph();
  if (!graph) {
    notify('El motor de audio no está listo. Reproduce algo primero.', 'warning');
    return null;
  }
  const dest = graph.ctx.createMediaStreamDestination();
  graph.analyser.connect(dest);
  streamDest = dest;
  return dest.stream;
}

async function captureDisplayStream(source: 'tab' | 'window'): Promise<MediaStream | null> {
  const displaySurface = source === 'tab' ? 'browser' : 'window';
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface },
    audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
  });

  const audioTracks = displayStream.getAudioTracks();
  if (audioTracks.length === 0) {
    const hint = source === 'tab'
      ? 'Selecciona una pestaña y activa "Compartir audio de la pestaña".'
      : 'Selecciona una ventana. Si no tiene audio, usa el modo "Pestaña" o activa "Compartir audio del sistema".';
    notify(`No se detectó audio. ${hint}`, 'warning');
    displayStream.getTracks().forEach((t) => t.stop());
    return null;
  }
  displayStream.getVideoTracks().forEach((t) => t.stop());

  // The user can stop sharing from the browser's own UI at any point — treat
  // that exactly like pressing Stop, instead of leaving a dead recording.
  audioTracks[0].addEventListener('ended', () => {
    if (mediaRecorder) {
      stop();
      notify('Se dejó de compartir: grabación guardada', 'info');
    }
  });

  return new MediaStream(audioTracks);
}

export async function start(source: RecorderSource): Promise<void> {
  if (mediaRecorder || useRecorderStore.getState().status !== 'idle') return;
  useRecorderStore.getState().setStatus('processing');

  try {
    const mediaStream = source === 'app' ? await captureAppStream() : await captureDisplayStream(source);
    if (!mediaStream) {
      useRecorderStore.getState().setStatus('idle');
      return;
    }

    stream = mediaStream;
    const mimeType = getSupportedMimeType();
    const mr = new MediaRecorder(mediaStream, { mimeType, audioBitsPerSecond: 192000 });
    chunks = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.start(100);
    mediaRecorder = mr;

    startLevelMeter(mediaStream);
    useRecorderStore.getState().setElapsed(0);
    useRecorderStore.getState().setStatus('recording');
    startTimer();
  } catch (err) {
    useRecorderStore.getState().setStatus('idle');
    if ((err as Error).name !== 'AbortError') {
      notify(`Error al iniciar grabación: ${(err as Error).message}`, 'error');
    }
  }
}

export function stop(): void {
  const mr = mediaRecorder;
  if (!mr) return;

  mr.onstop = () => {
    const mimeType = mr.mimeType;
    const ext = getFileExtFromMime(mimeType);
    const blob = new Blob(chunks, { type: mimeType });
    const elapsed = useRecorderStore.getState().elapsed;
    useRecorderStore.getState().addRecording({
      id: crypto.randomUUID(),
      name: `grabacion-${formatDate(new Date())}.${ext}`,
      blob,
      duration: elapsed,
      size: blob.size,
      createdAt: new Date(),
      format: ext,
    });
    chunks = [];
  };

  mr.stop();
  stream?.getTracks().forEach((t) => t.stop());
  if (streamDest) {
    getAudioGraph()?.analyser.disconnect(streamDest);
    streamDest = null;
  }
  stopTimer();
  stopLevelMeter();
  mediaRecorder = null;
  stream = null;
  useRecorderStore.getState().setStatus('idle');
}

export function pauseResume(): void {
  const mr = mediaRecorder;
  if (!mr) return;
  if (useRecorderStore.getState().status === 'recording') {
    mr.pause();
    stopTimer();
    useRecorderStore.getState().setStatus('paused');
  } else {
    mr.resume();
    startTimer();
    useRecorderStore.getState().setStatus('recording');
  }
}
