import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PageTransition } from '../shared/components/layout/PageTransition';
import { Visualizer } from '../shared/components/audio/Visualizer';
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
import { proxify, proxyHttp } from '../shared/utils/corsProxy';
import { Howl } from 'howler';
import { getRadioHowl, setRadioHowl, stopRadio } from '../modules/radio/services/radioPlayer';
import * as localEngine from '../modules/player/services/localEngine';

export default function RadioPage() {
  const { uuid } = useParams();
  const [searchParams] = useSearchParams();
  const { stations, isLoading, currentStation, setCurrentStation, setIsPlaying, setStatus, status } = useRadioStore(
    useShallow((s) => ({
      stations: s.stations, isLoading: s.isLoading, currentStation: s.currentStation,
      setCurrentStation: s.setCurrentStation, setIsPlaying: s.setIsPlaying, setStatus: s.setStatus, status: s.status,
    })),
  );
  const { loadTopStations, search } = useRadioBrowser();
  const { check } = useStreamCheck();
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [visMode, setVisMode] = useState<'bars' | 'wave' | 'circular'>('bars');

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
    localEngine.pause();

    const url = station.url_resolved || station.url;

    // Stop previous radio
    const prev = getRadioHowl();
    if (prev) {
      prev.unload();
      setRadioHowl(null);
    }

    // Check URL validity
    const valid = await check(url);
    if (!valid) {
      setStatus('offline');
      return;
    }

    radioBrowserApi.registerClick(station.stationuuid);

    // Try URLs in order: proxy -> direct -> AllOrigins (for HTTP-only streams)
    const isHttp = url.startsWith('http://');
    const tryUrls = [
      proxify(url),           // 1. CORS proxy (Cloudflare Worker)
      url,                    // 2. Direct URL
      ...(isHttp ? [proxyHttp(url)] : []), // 3. AllOrigins for HTTP streams
    ].filter((u, i, arr) => u !== arr[i - 1]); // dedupe if no proxy configured

    const tryPlay = (urls: string[], retries = 0) => {
      if (urls.length === 0) {
        setStatus('error');
        return;
      }

      const [currentUrl, ...rest] = urls;

      const howl = new Howl({
        src: [currentUrl],
        html5: true,
        format: station.hls ? ['m3u8'] : ['mp3', 'aac', 'ogg'],
        onplay: () => {
          console.log('Stream playing:', currentUrl);
          setStatus('playing');
        },
        onloaderror: (err) => {
          console.error('Stream load error:', currentUrl, err);
          if (rest.length > 0) {
            setTimeout(() => tryPlay(rest), 500);
          } else {
            setStatus('error');
          }
        },
        onplayerror: (err) => {
          console.error('Stream play error:', currentUrl, err);
          if (rest.length > 0) {
            setTimeout(() => tryPlay(rest), 500);
          } else {
            setStatus('error');
          }
        },
        onstop: () => setStatus('idle'),
      });
      setRadioHowl(howl);
      howl.play();
    };

    tryPlay(tryUrls);
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
            {status === 'playing' ? '🔊' : '⏳'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{currentStation.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {status}
            </div>
          </div>

          {/* Play/Pause for radio */}
          <button
            onClick={() => setIsPlaying(!useRadioStore.getState().isPlaying)}
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
            {status === 'playing' ? '⏸' : '▶'}
          </button>

          {/* Visualizer */}
          <div style={{ width: 120 }}>
            <Visualizer width={120} height={40} mode={visMode} compact />
          </div>

          {/* Vis mode selector */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={() => setVisMode('bars')}
              style={{
                background: visMode === 'bars' ? 'var(--accent-primary)' : 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: visMode === 'bars' ? 'var(--bg-base)' : 'var(--text-secondary)',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              ▌▌▌
            </button>
            <button
              onClick={() => setVisMode('wave')}
              style={{
                background: visMode === 'wave' ? 'var(--accent-primary)' : 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: visMode === 'wave' ? 'var(--bg-base)' : 'var(--text-secondary)',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              〜〜
            </button>
            <button
              onClick={() => setVisMode('circular')}
              style={{
                background: visMode === 'circular' ? 'var(--accent-primary)' : 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                color: visMode === 'circular' ? 'var(--bg-base)' : 'var(--text-secondary)',
                borderRadius: 4,
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              ◎
            </button>
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
          <div className="station-grid">
            {stations.map((station, i) => (
              <StationCard
                key={station.stationuuid}
                station={station}
                index={i}
                onClick={() => { setSelectedStation(station); playStation(station); }}
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
