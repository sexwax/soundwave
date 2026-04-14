import { Helmet } from 'react-helmet-async';
import { Recorder } from '../modules/recorder/components/Recorder';
import { PageTransition } from '../shared/components/layout/PageTransition';

export default function RecorderPage() {
  return (
    <PageTransition>
    <div>
      <Helmet><title>Grabador — SoundWave</title></Helmet>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent-primary)', marginBottom: 20 }}>
        ⏺️ Grabador de audio
      </h2>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)', maxWidth: 700 }}>
        <Recorder />
      </div>
    </div>
    </PageTransition>
  );
}
