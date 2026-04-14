import type { InputHTMLAttributes } from 'react';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Slider({ label, className, ...rest }: SliderProps) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
      )}
      <input
        type="range"
        style={{
          accentColor: 'var(--accent-primary)',
          cursor: 'pointer',
          width: '100%',
        }}
        {...rest}
      />
    </div>
  );
}
