import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEqStore } from '../../audio/eqStore';
import { Equalizer } from './Equalizer';

/**
 * Global EQ panel, mounted once in AppInner, anchored above the MiniPlayer.
 * Opened from the MiniPlayer's 🎚️ button, the toolbar buttons in LocalPlayer/
 * RadioPage, or the "E" keyboard shortcut — all of them just flip
 * eqStore.panelOpen.
 */
export function EqualizerPanel() {
  const panelOpen = useEqStore((s) => s.panelOpen);
  const togglePanel = useEqStore((s) => s.togglePanel);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') togglePanel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [panelOpen, togglePanel]);

  return (
    <AnimatePresence>
      {panelOpen && (
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          style={{
            position: 'fixed',
            bottom: 'var(--player-height)',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px 12px',
            zIndex: 900,
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: '100%', maxWidth: 720, position: 'relative', pointerEvents: 'auto' }}>
            <button
              onClick={togglePanel}
              aria-label="Cerrar ecualizador"
              style={{
                position: 'absolute', top: -12, right: 8, zIndex: 1,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
            <Equalizer />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
