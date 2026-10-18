import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useRadioStore, type RadioStation } from '../store/radioStore';
import { useFavoritesStore } from '../../favorites/store/favoritesStore';
import { flagEmoji } from '../../../shared/utils/formatters';
import { Badge } from '../../../shared/components/ui/Badge';

interface Props {
  station: RadioStation;
  onClick: () => void;
  index?: number;
}

export function StationCard({ station, onClick, index = 0 }: Props) {
  const { currentStation, isPlaying } = useRadioStore(
    useShallow((s) => ({ currentStation: s.currentStation, isPlaying: s.isPlaying })),
  );
  const favorites = useFavoritesStore((s) => s.favorites);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const isActive = currentStation?.stationuuid === station.stationuuid;
  const fav = favorites.some((f) => f.stationuuid === station.stationuuid);

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fav) removeFavorite(station.stationuuid);
    else addFavorite({
      stationuuid: station.stationuuid,
      name: station.name,
      url: station.url_resolved || station.url,
      favicon: station.favicon,
      country: station.country,
      language: station.language,
      tags: station.tags,
      bitrate: station.bitrate,
      codec: station.codec,
    });
  };

  return (
    <motion.div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, delay: index < 20 ? index * 0.03 : 0 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: 6,
      }}
      className="station-card"
    >
      {/* Logo */}
      <div
        className="station-logo"
        style={{
          width: 36, height: 36, borderRadius: 6, flexShrink: 0,
          background: 'var(--bg-base)',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {station.favicon ? (
          <img src={station.favicon} alt="" style={{ width: '100%', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : <span style={{ fontSize: 16 }}>📻</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'clamp(12px, 3vw, 13px)',
          fontWeight: 600,
          color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)',
        }}>
          {isActive && isPlaying && <span style={{ marginRight: 6 }}>▶</span>}
          {station.name}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {flagEmoji(station.countrycode)} {station.country}
          </span>
          {station.bitrate > 0 && <Badge>{station.bitrate}kbps</Badge>}
          {station.codec && <Badge>{station.codec}</Badge>}
        </div>
      </div>

      {/* Fav button */}
      <button
        onClick={toggleFav}
        aria-label={fav ? 'Quitar favorito' : 'Añadir favorito'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
          color: fav ? 'var(--accent-danger)' : 'var(--text-disabled)',
          flexShrink: 0,
          padding: 4,
        }}
      >
        {fav ? '❤️' : '🤍'}
      </button>
    </motion.div>
  );
}
