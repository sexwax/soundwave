import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { PageTransition } from '../shared/components/layout/PageTransition';
import { useParams, useSearchParams } from 'react-router-dom';
import { RadioSearch } from '../modules/radio/components/RadioSearch';
import { StationCard } from '../modules/radio/components/StationCard';
import { StationDetail } from '../modules/radio/components/StationDetail';
import { Modal } from '../shared/components/ui/Modal';
import { SharePanel } from '../modules/radio/components/SharePanel';
import { Spinner } from '../shared/components/ui/Spinner';
import { useRadioStore, type RadioStation } from '../modules/radio/store/radioStore';
import { useRadioBrowser } from '../modules/radio/hooks/useRadioBrowser';
import { useStreamCheck } from '../modules/radio/hooks/useStreamCheck';
import { radioBrowserApi } from '../modules/radio/services/radioBrowserApi';
import { proxify } from '../shared/utils/corsProxy';
import { Howl } from 'howler';
import { getRadioHowl, setRadioHowl, stopRadio } from '../modules/radio/services/radioPlayer';
import { usePlayerStore } from '../modules/player/store/playerStore';

export default function RadioPage() {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const { stations, isLoading, currentStation, setCurrentStation, setIsPlaying, setStatus, status } = useRadioStore();
  const stopLocalPlayer = usePlayerStore((s) => s.setIsPlaying);
  const { loadTopStations, search } = useRadioBrowser();
  const { check } = useStreamCheck();
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  const [showShare, setShowShare] = useState(false);

  // Load top stations on mount
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) search({ name: q, limit: 50 });
    else if (stations.length === 0) loadTopStations();
  }, []);

  const playStation = async (station: RadioStation) => {
    setSelectedStation(station);
    setCurrentStation(station);
    setStatus('connecting');
    setIsPlaying(true);

    // Stop local player if it's running
    stopLocalPlayer(false);

    const url = station.url_resolved || station.url;

    // Stop previous radio
    const prev = getRadioHowl();
    if (prev) {
      prev.unload();
      setRadioHowl(null);
    }

    // Check availability
    const available = await check(url);
    if (!available) {
      setStatus('offline');
      return;
    }

    radioBrowserApi.registerClick(station.stationuuid);

    const tryPlay = (streamUrl: string, retries = 3) => {
      const howl = new Howl({
        src: [streamUrl],
        html5: true,
        format: station.hls ? ['m3u8'] : ['mp3', 'aac', 'ogg'],
        onplay: () => setStatus('playing'),
        onloaderror: (_: any, err: any) => {
          console.error('Stream error', err);
          if (retries > 0) {
            setTimeout(() => tryPlay(proxify(streamUrl), retries - 1), 1000 * (4 - retries));
          } else {
            setStatus('error');
          }
        },
        onstop: () => setStatus('idle'),
      });
      setRadioHowl(howl);
      howl.play();
    };

    tryPlay(url);
  };

  // Handle deep link to specific station
  useEffect(() => {
    if (uuid && stations.length > 0) {
      const s = stations.find((s) => s.stationuuid === uuid);
      if (s) playStation(s);
    }
  }, [uuid, stations]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopStation = () => stopRadio();

  return (
    <PageTransition>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
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
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', background: 'var(--bg-elevated)',
          borderRadius: 12, border: `1px solid var(--accent-primary)33`,
        }}>
          <span style={{ fontSize: 20 }}>
            {status === 'playing' ? '🔊' : '⏳'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{currentStation.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {status}
            </div>
          </div>
          <button
            onClick={() => setShowShare(true)}
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          >
            🔗 Compartir
          </button>
          <button onClick={stopStation} style={{ background: 'var(--accent-danger)', border: 'none', color: 'white', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
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
          stations.map((station, i) => (
            <StationCard
              key={station.stationuuid}
              station={station}
              index={i}
              onClick={() => { setSelectedStation(station); playStation(station); }}
            />
          ))
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
