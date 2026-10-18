import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AudioProvider } from './providers/AudioProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { NotificationProvider } from './providers/NotificationProvider';
import { Sidebar } from '../shared/components/layout/Sidebar';
import { TopBar } from '../shared/components/layout/TopBar';
import { MiniPlayer } from '../shared/components/layout/MiniPlayer';
import { ShortcutsHelp } from '../shared/components/layout/ShortcutsHelp';
import { Modal } from '../shared/components/ui/Modal';
import { AppRouter } from './Router';
import { useKeyboardShortcuts } from '../shared/hooks/useKeyboardShortcuts';
import { useMediaSession } from '../shared/hooks/useMediaSession';
import { useFavoritesStore } from '../modules/favorites/store/favoritesStore';
import { useAudioEngine } from '../modules/player/hooks/useAudioEngine';

function AppInner() {
  const { showHelp, closeHelp } = useKeyboardShortcuts();
  useMediaSession();
  useAudioEngine();
  useEffect(() => { void useFavoritesStore.getState().load(); }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      <TopBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            background: 'var(--bg-base)',
          }}
        >
          <AppRouter />
        </main>
      </div>
      <MiniPlayer />
      <Modal open={showHelp} onClose={closeHelp} title="Atajos de teclado">
        <ShortcutsHelp />
      </Modal>
    </div>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AudioProvider>
            <NotificationProvider>
              <AppInner />
            </NotificationProvider>
          </AudioProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
