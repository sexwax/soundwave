import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../store/favoritesStore';
import { flagEmoji } from '../../../shared/utils/formatters';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { notify } from '../../../shared/utils/notify';

const CLEAR_HISTORY_CONFIRM_TIMEOUT_MS = 4000;

export function FavoritesList() {
  const { favorites, history, load, removeFavorite, importFavorites, clearHistory } = useFavoritesStore();
  const navigate = useNavigate();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => { load(); }, [load]);

  const playStation = (uuid: string) => {
    navigate('/station/' + uuid);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'soundwave-favorites.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportM3U = () => {
    const lines = ['#EXTM3U', ...favorites.flatMap(f => [
      `#EXTINF:-1 tvg-logo="${f.favicon}" group-title="${f.tags}",${f.name}`,
      f.url,
    ])];
    const blob = new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'soundwave-favorites.m3u'; a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = () => importInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const imported = importFavorites(data);
      notify(
        imported > 0 ? `${imported} favoritos importados` : 'No había favoritos nuevos para importar',
        imported > 0 ? 'success' : 'info',
      );
    } catch {
      notify('El archivo no es un JSON de favoritos válido', 'error');
    }
  };

  const handleClearHistory = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), CLEAR_HISTORY_CONFIRM_TIMEOUT_MS);
      return;
    }
    setConfirmingClear(false);
    void clearHistory();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Actions */}
      <div className="favorites-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="outline" size="sm" onClick={exportJson}>📥 Exportar JSON</Button>
        <Button variant="outline" size="sm" onClick={exportM3U}>📥 Exportar M3U</Button>
        <Button variant="outline" size="sm" onClick={importJson}>📤 Importar JSON</Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Favorites */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 12 }}>
          ❤️ Emisoras favoritas ({favorites.length})
        </h3>
        {favorites.length === 0 ? (
          <p style={{ color: 'var(--text-disabled)', fontSize: 14 }}>
            No tienes favoritos aún. Añade emisoras desde la sección Radio.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {favorites.map((fav) => (
              <div
                key={fav.stationuuid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-base)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {fav.favicon ? <img src={fav.favicon} alt="" style={{ width: '100%', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span>📻</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{fav.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {flagEmoji(fav.countrycode ?? '')} {fav.country} <Badge>{fav.bitrate}kbps</Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => playStation(fav.stationuuid)}>▶ Escuchar</Button>
                <Button size="sm" variant="ghost" onClick={() => removeFavorite(fav.stationuuid)}>✕</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>
            🕐 Historial reciente
          </h3>
          {history.length > 0 && (
            <Button size="sm" variant={confirmingClear ? 'danger' : 'ghost'} onClick={handleClearHistory}>
              {confirmingClear ? '¿Seguro? Confirmar' : '🗑️ Borrar historial'}
            </Button>
          )}
        </div>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-disabled)', fontSize: 14 }}>Sin historial todavía.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {history.slice(0, 30).map((h) => (
              <div
                key={h.id}
                onClick={h.type === 'radio' && h.stationuuid ? () => playStation(h.stationuuid!) : undefined}
                role={h.type === 'radio' ? 'button' : undefined}
                tabIndex={h.type === 'radio' ? 0 : undefined}
                style={{
                  display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center',
                  cursor: h.type === 'radio' ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: 16 }}>{h.type === 'radio' ? '📻' : '🎵'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</div>
                  {h.artist && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{h.artist}</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', flexShrink: 0 }}>
                  {new Date(h.playedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
