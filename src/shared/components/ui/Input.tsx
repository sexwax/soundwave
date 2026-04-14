import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...rest }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          padding: '8px 12px',
          outline: 'none',
          ...style,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        {...rest}
      />
    </div>
  );
}
