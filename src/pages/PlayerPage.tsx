import { Helmet } from 'react-helmet-async';
import { LocalPlayer } from '../modules/player/components/LocalPlayer';
import { PageTransition } from '../shared/components/layout/PageTransition';

export default function PlayerPage() {
  return (
    <PageTransition>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Helmet>
        <title>SoundWave — Reproductor</title>
        <meta property="og:title" content="SoundWave — Reproductor" />
        <meta property="og:description" content="Reproduce tus archivos de música locales" />
      </Helmet>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20, color: 'var(--accent-primary)' }}>
        🎵 Reproductor local
      </h2>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LocalPlayer />
      </div>
    </div>
    </PageTransition>
  );
}
