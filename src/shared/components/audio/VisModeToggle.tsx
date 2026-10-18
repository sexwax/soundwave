export type VisMode = 'bars' | 'wave' | 'circular';

const MODES: { mode: VisMode; label: string }[] = [
  { mode: 'bars', label: '▌▌▌' },
  { mode: 'wave', label: '〜〜' },
  { mode: 'circular', label: '◎' },
];

interface VisModeToggleProps {
  mode: VisMode;
  onChange: (mode: VisMode) => void;
}

export function VisModeToggle({ mode, onChange }: VisModeToggleProps) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => onChange(m.mode)}
          aria-label={`Visualizador ${m.mode}`}
          aria-pressed={mode === m.mode}
          style={{
            background: mode === m.mode ? 'var(--accent-primary)' : 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            color: mode === m.mode ? 'var(--bg-base)' : 'var(--text-secondary)',
            borderRadius: 4,
            padding: '2px 6px',
            cursor: 'pointer',
            fontSize: 10,
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
