import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: string;
}

export function Badge({ children, color }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        background: color || 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </span>
  );
}
