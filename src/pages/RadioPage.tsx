import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PageTransition } from '../shared/components/layout/PageTransition';
import { Visualizer } from '../shared/components/audio/Visualizer';
import { VisModeToggle, type VisMode } from '../shared/components/audio/VisModeToggle';
import { useParams, useSearchParams } from 'react-router-dom';
import { RadioSearch } from '../modules/radio/components/RadioSearch';
import { StationCard } from '../modules/radio/components/StationCard';
import { StationDetail } from '../modules/radio/components/StationDetail';
import { Modal } from '../shared/components/ui/Modal';
import { SharePanel } from '../modules/radio/components/SharePanel';
import { Spinner } from '../shared/components/ui/Spinner';
import { useRadioStore, type RadioStation, type RadioStatus } from '../modules/radio/store/radioStore';
import { useRadioBrowser } from '../modules/radio/hooks/useRadioBrowser';
import { radioBrowserApi } from '../modules/radio/services/radioBrowserApi';
import { playStation, toggleRadio, stopRadio } from '../modules/radio/services/radioPlayer';

const STATUS_LABEL: Record<RadioStatus, string> = {
  idle: 'Inactivo',
  connecting: 'Conectando…',
  playing: 'En directo',
  paused: 'En pausa',
  error: 'Error — toca para reintentar',
};

const STATUS_ICON: Record<RadioStatus, string> = {
  idle: '📻',
  connecting: '⏳',
  playing: '🔊',
  paused: '⏸',
  error: '⚠️',
};

export default function RadioPage() {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const { stations, isLoading, currentStation, routed, status, setSearchQuery } = useRadioStore(
    useShallow((s) => ({
      stations: s.stations, isLoading: s.isLoading, currentStation: s.currentStation,
      routed: s.routed, status: s.status, setSearchQuery: s.setSearchQuery,
    })),
  );
  const { loadTopStations, search } = useRadioBrowser();
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [visMode, setVisMode] = useState<VisMode>('bars');
  const q = searchParams.get('q');

  // React to `?q=` changes even while already on /radio (not just on mount).
  useEffect(() => {
    if (q) {
      setSearchQuery(q);
      search({ name: q, limit: 50 });
    }
  }, [q, setSearchQuery, search]);

  // Mount-only: load the top stations when landing on /radio without a search query.
  useEffect(() => {
    if (!q && useRadioStore.getState().stations.length === 0) loadTopStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link to a specific station: play it if already loaded, otherwise fetch it by uuid.
  useEffect(() => {
    if (!uuid) return;
    const stationUuid = uuid;
    let cancelled = false;

    async function connectToDeepLinkedStation() {
      const existing = stations.find((s) => s.stationuuid === stationUuid);
      if (existing) {
        if (!cancelled) void playStation(existing);
        return;
      }
      try {
        const [found] = await radioBrowserApi.byUuid(stationUuid);
        if (!cancelled && found) void playStation(found);
      } catch {
        // Network error resolving the deep link — the page stays on the normal list view.
      }
    }

    void connectToDeepLinkedStation();
    return () => { cancelled = true; };
    // Only re-run when the uuid itself changes — `stations` is read from the latest snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);

  const retryCurrentStation = () => {
    if (currentStation) void playStation(currentStation);
  };

  return (
    <PageTransition>
    <div className="radio-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <Helmet>
        <title>{currentStation ? `${currentStation.name} — SoundWave` : 'Radio — SoundWave'}</title>
        <meta property="og:title" content={currentStation ? currentStation.name : 'Radio en línea — SoundWave'} />
        <meta property="og:description" content={currentStation ? `Escucha ${currentStation.name} en SoundWave` : 'Descubre y escucha emisoras de radio de todo el mundo'} />
      </Helmet>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent-primary)', margin: 0 }}>
        📻 Emisoras de radio
      </h2>

      <RadioSearch />

      {/* Current station status */}
      {currentStation && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 16px',
          background: 'var(--bg-elevated)',
          borderRadius: 12,
          border: `1px solid var(--accent-primary)33`,
        }}>
          <span style={{ fontSize: 20 }}>
            {STATUS_ICON[status]}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{currentStation.name}</div>
            <div
              style={{ fontSize: 11, color: status === 'error' ? 'var(--accent-danger)' : 'var(--text-secondary)', cursor: status === 'error' ? 'pointer' : 'default' }}
              onClick={status === 'error' ? retryCurrentStation : undefined}
            >
              {STATUS_LABEL[status]}
            </div>
            {!routed && (status === 'playing' || status === 'paused') && (
              <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>
                Visualizador y EQ no disponibles para esta emisora (el servidor no permite CORS)
              </div>
            )}
          </div>

          {/* Play/Pause for radio */}
          <button
            onClick={toggleRadio}
            style={{
              background: 'var(--accent-primary)',
              border: 'none',
              color: 'var(--bg-base)',
              width: 40,
              height: 40,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={status === 'playing' ? 'Pausar' : 'Reproducir'}
          >
            {status === 'playing' || status === 'connecting' ? '⏸' : '▶'}
          </button>

          {/* Visualizer */}
          <div style={{ width: 120 }}>
            <Visualizer width={120} height={40} mode={visMode} compact />
          </div>

          {/* Vis mode selector */}
          <VisModeToggle mode={visMode} onChange={setVisMode} />

          <button
            onClick={() => setShowShare(true)}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          >
            🔗 Compartir
          </button>
          <button onClick={stopRadio} style={{ background: 'var(--accent-danger)', border: 'none', color: 'white', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            ⏹ Stop
          </button>
        </div>
      )}

      {/* Station list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size={32} />
          </div>
        ) : stations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-disabled)' }}>
            <span style={{ fontSize: 48 }}>📻</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
              Busca emisoras o carga las más populares
            </p>
          </div>
        ) : (
          <div className="station-grid">
            {stations.map((station, i) => (
              <StationCard
                key={station.stationuuid}
                station={station}
                index={i}
                onClick={() => playStation(station)}
                onShowDetail={() => setSelectedStation(station)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Station detail modal */}
      <Modal
        open={!!selectedStation}
        onClose={() => setSelectedStation(null)}
        title="Detalle de emisora"
      >
        {selectedStation && (
          <StationDetail
            station={selectedStation}
            onClose={() => setSelectedStation(null)}
          />
        )}
      </Modal>

      {/* Share modal */}
      <Modal
        open={showShare}
        onClose={() => setShowShare(false)}
        title="Compartir emisora"
      >
        {currentStation && showShare && (
          <SharePanel station={currentStation} />
        )}
      </Modal>
    </div>
    </PageTransition>
  );
}
