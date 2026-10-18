import { useShallow } from 'zustand/react/shallow';
import { useRecorderStore } from '../store/recorderStore';
import * as recorderService from '../services/recorderService';
import { VUMeter } from './VUMeter';
import { Button } from '../../../shared/components/ui/Button';
import { notify } from '../../../shared/utils/notify';

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

interface SavedRecording {
  name: string;
  blob: Blob;
}

async function saveRecording(rec: SavedRecording): Promise<void> {
  if ('showSaveFilePicker' in window) {
    try {
      const ext = rec.name.split('.').pop() ?? 'webm';
      const handle = await window.showSaveFilePicker({
        suggestedName: rec.name,
        types: [{ description: 'Audio', accept: { [`audio/${ext}`]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(rec.blob);
      await writable.close();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        notify(`No se pudo guardar la grabación: ${(err as Error).message}`, 'error');
      }
    }
  } else {
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rec.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function Recorder() {
  const { status, source, elapsed, level, recordings, setSource, removeRecording } = useRecorderStore(
    useShallow((s) => ({
      status: s.status, source: s.source, elapsed: s.elapsed, level: s.level,
      recordings: s.recordings, setSource: s.setSource, removeRecording: s.removeRecording,
    })),
  );

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isActive = isRecording || isPaused;

  const handleToggle = () => {
    if (isActive) recorderService.stop();
    else void recorderService.start(source);
  };

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
          onClick={handleToggle}
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
            onClick={recorderService.pauseResume}
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

