import { NavLink } from 'react-router-dom';
import { useTheme } from '../../../app/providers/useTheme';
import { useRecorderStore } from '../../../modules/recorder/store/recorderStore';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/', label: 'Player', icon: '🎵' },
  { path: '/radio', label: 'Radio', icon: '📻' },
  { path: '/favorites', label: 'Favoritos', icon: '❤️' },
  { path: '/recorder', label: 'Grabar', icon: '⏺️' },
];

export function Sidebar() {
  const { theme, setTheme } = useTheme();
  const isRecording = useRecorderStore((s) => s.status === 'recording');
  const [isOpen, setIsOpen] = useState(false);
  const themes = ['dark', 'light', 'neon'] as const;

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="mobile-only"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 1000,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
        aria-label="Menú"
      >
        ☰
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="mobile-only"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1001,
          }}
        />
      )}

      <aside
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          height: '100%',
          flexShrink: 0,
          position: 'relative',
        }}
        className={isOpen ? 'sidebar-open' : ''}
      >
      {/* Logo */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--accent-primary)',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          ◈ SoundWave
        </h1>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              marginBottom: 4,
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s',
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.path === '/recorder' && isRecording && (
              <span
                className="pulse-rec"
                aria-label="Grabando"
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent-danger)',
                  marginLeft: 'auto',
                }}
              />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Theme selector - desktop only */}
      <div className="desktop-only" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginBottom: 8 }}>TEMA</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {themes.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              aria-label={`Tema ${t}`}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 11,
                background: theme === t ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: theme === t ? 'var(--bg-base)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </aside>
    </>
  );
}
