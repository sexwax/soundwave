import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded font-mono transition-all select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        {
          // variants
          'bg-[var(--accent-primary)] text-[var(--bg-base)] hover:opacity-90 font-semibold':
            variant === 'primary',
          'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]':
            variant === 'ghost',
          'bg-[var(--accent-danger)] text-white hover:opacity-90': variant === 'danger',
          'border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] bg-transparent':
            variant === 'outline',
          // sizes
          'text-xs px-2 py-1 h-6': size === 'sm',
          'text-sm px-3 py-2 h-9': size === 'md',
          'text-base px-5 py-3 h-12': size === 'lg',
          'w-9 h-9 p-0': size === 'icon',
        },
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
