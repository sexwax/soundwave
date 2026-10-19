import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useRadioStore, type RadioStation } from '../store/radioStore';
import { useFavoritesStore } from '../../favorites/store/favoritesStore';
import { flagEmoji } from '../../../shared/utils/formatters';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { radioBrowserApi } from '../services/radioBrowserApi';
import { notify } from '../../../shared/utils/notify';

interface Props {
  station: RadioStation;
  onClose: () => void;
}

export function StationDetail({ station, onClose }: Props) {
  const { currentStation, status } = useRadioStore(
    useShallow((s) => ({ currentStation: s.currentStation, status: s.status })),
  );
  const favorites = useFavoritesStore((s) => s.favorites);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const isActive = currentStation?.stationuuid === station.stationuuid;
  const fav = favorites.some((f) => f.stationuuid === station.stationuuid);
  const [voted, setVoted] = useState(false);

  const vote = async () => {
    const result = await radioBrowserApi.vote(station.stationuuid);
    notify(result.message, result.ok ? 'success' : 'error');
    if (result.ok) setVoted(true);
  };

  const tags = station.tags.split(',').filter(Boolean).slice(0, 5);

  return (
    <div style={{ minWidth: 280 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 12, flexShrink: 0,
          background: 'var(--bg-base)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border-subtle)',
        }}>
          {station.favicon ? (
            <img src={station.favicon} alt="" style={{ width: '100%', objectFit: 'contain' }} />
          ) : <span style={{ fontSize: 36 }}>📻</span>}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 16 }}>
            {station.name}
          </h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {flagEmoji(station.countrycode)} {station.country}
          </div>
          {station.language && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
              🗣 {station.language}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {station.bitrate > 0 && <Badge>{station.bitrate}kbps</Badge>}
            <Badge>{station.codec}</Badge>
            {isActive && (
              <Badge color={status === 'playing' ? 'var(--accent-success)' : 'var(--accent-warning)'}>
                {status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {tags.map((t) => <Badge key={t}>{t.trim()}</Badge>)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          onClick={() => fav ? removeFavorite(station.stationuuid) : addFavorite({
            stationuuid: station.stationuuid,
            name: station.name,
            url: station.url_resolved || station.url,
            favicon: station.favicon,
            country: station.country,
            countrycode: station.countrycode,
            language: station.language,
            tags: station.tags,
            bitrate: station.bitrate,
            codec: station.codec,
          })}
          variant={fav ? 'danger' : 'outline'}
          size="sm"
        >
          {fav ? '💔 Quitar' : '❤️ Favorito'}
        </Button>
        <Button onClick={vote} variant="ghost" size="sm" disabled={voted}>
          {voted ? '✓ Votado' : `👍 Votar (${station.votes})`}
        </Button>
        <Button onClick={onClose} variant="ghost" size="sm">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
