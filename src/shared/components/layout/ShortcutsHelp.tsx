const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'Espacio', description: 'Reproducir / pausar la fuente activa (radio o local)' },
  { keys: '← / →', description: 'Pista anterior / siguiente (solo local)' },
  { keys: 'Shift + ← / →', description: 'Retroceder / avanzar 10 segundos (solo local)' },
  { keys: '↑ / ↓', description: 'Subir / bajar volumen 5%' },
  { keys: 'M', description: 'Silenciar / activar sonido' },
  { keys: 'E', description: 'Abrir / cerrar el ecualizador' },
  { keys: '?', description: 'Mostrar esta ayuda' },
];

export function ShortcutsHelp() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {SHORTCUTS.map((s) => (
        <div key={s.keys} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <code style={{
            minWidth: 140, padding: '4px 8px', borderRadius: 6,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center',
          }}>
            {s.keys}
          </code>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.description}</span>
        </div>
      ))}
    </div>
  );
}
