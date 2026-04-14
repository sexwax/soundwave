import { useRef, useCallback, useEffect } from 'react';
import { useRecorderStore } from '../store/recorderStore';
import { useAudioContext } from '../../../app/providers/AudioProvider';
import { VUMeter } from './VUMeter';
import { Button } from '../../../shared/components/ui/Button';
import { getSupportedMimeType, formatFileSize, getFileExtFromMime } from '../../../shared/utils/audioUtils';
import { formatDate } from '../../../shared/utils/formatters';

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const SOURCES = [
  { id: 'app', label: '🎵 Esta app', description: null },
  { id: 'tab', label: '🌐 Pestaña', description: 'Pestaña de este navegador con audio' },
  { id: 'window', label: '🖥️ Ventana / App', description: 'Cualquier ventana: Opera, Chrome, Spotify, etc.' },
] as const;

export function Recorder() {
  const { status, source, elapsed, level, recordings, setStatus, setSource, setElapsed, setLevel, addRecording, removeRecording } = useRecorderStore();
  const { audioContext: appAudioContext, analyserNode: appAnalyserNode } = useAudioContext();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelAudioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const streamDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const startLevelMeter = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    levelAudioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSq = 0;
      for (const v of data) {
        const n = (v / 128) - 1;
        sumSq += n * n;
      }
      setLevel(Math.min(1, Math.sqrt(sumSq / data.length) * 5));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [setLevel]);

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    levelAudioCtxRef.current?.close();
    levelAudioCtxRef.current = null;
    setLevel(0);
  }, [setLevel]);

  const startRecording = useCallback(async () => {
    try {
      let stream: MediaStream;

      if (source === 'app') {
        if (!appAudioContext || !appAnalyserNode) {
          alert('El contexto de audio de la app no está listo. Reproduce algo primero.');
          return;
        }
        const dest = appAudioContext.createMediaStreamDestination();
        appAnalyserNode.connect(dest);
        streamDestRef.current = dest;
        stream = dest.stream;
      } else {
        // Seleccionar tipo de superficie según el modo
        const displaySurface = source === 'tab' ? 'browser' : 'window';

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface } as any,
          audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 } as any,
        });

        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length === 0) {
          const hint = source === 'tab'
            ? 'Selecciona una pestaña y activa "Compartir audio de la pestaña".'
            : 'Selecciona una ventana. Si no tiene audio, usa el modo "Pestaña" o activa "Compartir audio del sistema".';
          alert(`No se detectó audio. ${hint}`);
          displayStream.getTracks().forEach(t => t.stop());
          return;
        }
        displayStream.getVideoTracks().forEach(t => t.stop());
        stream = new MediaStream(audioTracks);
      }

      streamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 192000 });
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRecorderRef.current = mr;

      startLevelMeter(stream);
      setStatus('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(useRecorderStore.getState().elapsed + 1), 1000);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        alert(`Error al iniciar grabación: ${(e as Error).message}`);
      }
    }
  }, [source, startLevelMeter, setStatus, setElapsed]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    mr.onstop = () => {
      const mimeType = getSupportedMimeType();
      const ext = getFileExtFromMime(mimeType);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const elapsed = useRecorderStore.getState().elapsed;
      addRecording({
        id: Math.random().toString(36).slice(2),
        name: `grabacion-${formatDate(new Date())}.${ext}`,
        blob,
        duration: elapsed,
        size: blob.size,
        createdAt: new Date(),
        format: ext,
      });
      chunksRef.current = [];
    };

    mr.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (streamDestRef.current && appAnalyserNode) {
      appAnalyserNode.disconnect(streamDestRef.current);
      streamDestRef.current = null;
    }
    clearInterval(timerRef.current);
    stopLevelMeter();
    setStatus('idle');
  }, [addRecording, stopLevelMeter, setStatus]);

  const pauseResume = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (status === 'recording') {
      mr.pause();
      clearInterval(timerRef.current);
      setStatus('paused');
    } else {
      mr.resume();
      timerRef.current = setInterval(() => setElapsed(useRecorderStore.getState().elapsed + 1), 1000);
      setStatus('recording');
    }
  }, [status, setStatus, setElapsed]);

  const saveRecording = useCallback(async (rec: { name: string; blob: Blob }) => {
    if ('showSaveFilePicker' in window) {
      const ext = rec.name.split('.').pop() ?? 'webm';
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: rec.name,
        types: [{ description: 'Audio', accept: { [`audio/${ext}`]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(rec.blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(rec.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = rec.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    stopLevelMeter();
  }, [stopLevelMeter]);

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isActive = isRecording || isPaused;

  const activeSource = SOURCES.find(s => s.id === source)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Source selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            disabled={isActive}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '2px solid',
              borderColor: source === s.id ? 'var(--accent-primary)' : 'var(--border-default)',
              background: source === s.id ? 'var(--accent-primary)' : 'transparent',
              color: source === s.id ? 'var(--bg-base)' : 'var(--text-secondary)',
              cursor: isActive ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              opacity: isActive ? 0.6 : 1,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Source description */}
      {source === 'tab' && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          🌐 Se abrirá el selector de pestañas de <strong>este navegador</strong>. Elige la pestaña y activa <strong>"Compartir audio de la pestaña"</strong>.
          <br />📢 Asegúrate de tener los derechos para grabar el contenido que estás capturando.
        </div>
      )}
      {source === 'window' && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          🖥️ Se abrirá el selector de <strong>ventanas del sistema</strong>. Puedes elegir cualquier ventana abierta: Opera, Chrome, Spotify, etc.
          <br />⚠️ <strong>Limitación del navegador:</strong> Las pestañas individuales de otros navegadores no son accesibles desde una web app por seguridad. Para grabar audio de Opera, selecciona su ventana completa y activa "Compartir audio del sistema" si aparece esa opción.
          <br />💡 Si necesitas capturar pestañas de Opera con audio limpio, abre Opera y usa el modo <strong>"Pestaña"</strong> desde Opera directamente.
        </div>
      )}

      {/* Recording control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={isActive ? stopRecording : startRecording}
          aria-label={isActive ? 'Detener grabación' : 'Iniciar grabación'}
          style={{
            width: 60, height: 60, borderRadius: '50%',
            background: isRecording ? 'var(--accent-danger)' : 'var(--accent-primary)',
            border: 'none', cursor: 'pointer', fontSize: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRecording ? '0 0 20px rgba(239,68,68,0.5)' : 'none',
          }}
          className={isRecording ? 'pulse-rec' : ''}
        >
          {isActive ? '⏹' : '⏺'}
        </button>

        {isActive && (
          <button
            onClick={pauseResume}
            style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 18, padding: '6px 12px' }}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        )}

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, letterSpacing: 2, color: isActive ? 'var(--accent-danger)' : 'var(--text-disabled)' }}>
          {formatElapsed(elapsed)}
        </div>

        {isActive && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            ~{((elapsed * 192000) / 8 / 1024 / 1024).toFixed(1)} MB
          </div>
        )}
      </div>

      {/* VU Meter */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>NIVEL</div>
        <VUMeter level={level} width={400} height={28} />
      </div>

      {/* Recordings list */}
      {recordings.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 14 }}>
            Grabaciones de esta sesión
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recordings.map((rec) => (
              <div
                key={rec.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rec.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {formatElapsed(rec.duration)} • {(rec.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button size="sm" variant="outline" onClick={() => saveRecording(rec)}>💾 Guardar</Button>
                <Button size="sm" variant="ghost" onClick={() => removeRecording(rec.id)}>✕</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
