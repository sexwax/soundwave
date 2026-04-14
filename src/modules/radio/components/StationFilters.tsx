import { useRadioStore } from '../store/radioStore';
import { Slider } from '../../../shared/components/ui/Slider';
import { Input } from '../../../shared/components/ui/Input';

export function StationFilters() {
  const { filters, updateFilter } = useRadioStore();

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '12px 0' }}>
      <div style={{ flex: '1 1 140px' }}>
        <Input
          label="País"
          placeholder="España, USA..."
          value={filters.country}
          onChange={(e) => updateFilter('country', e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 140px' }}>
        <Input
          label="Idioma"
          placeholder="spanish, english..."
          value={filters.language}
          onChange={(e) => updateFilter('language', e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 200px' }}>
        <Slider
          label={`Bitrate mínimo: ${filters.bitrateMin} kbps`}
          min={0} max={320} step={32}
          value={filters.bitrateMin}
          onChange={(e) => updateFilter('bitrateMin', Number(e.target.value))}
        />
      </div>
      <div style={{ flex: '1 1 120px' }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
          Codec
        </label>
        <select
          value={filters.codec}
          onChange={(e) => updateFilter('codec', e.target.value)}
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 12px',
            width: '100%', cursor: 'pointer',
          }}
        >
          <option value="">Todos</option>
          <option value="MP3">MP3</option>
          <option value="AAC">AAC</option>
          <option value="OGG">OGG</option>
          <option value="HLS">HLS</option>
        </select>
      </div>
      <div style={{ flex: '1 1 120px' }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
          Ordenar por
        </label>
        <select
          value={filters.order}
          onChange={(e) => updateFilter('order', e.target.value)}
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: 13, padding: '8px 12px',
            width: '100%', cursor: 'pointer',
          }}
        >
          <option value="votes">Votos</option>
          <option value="clickcount">Popularidad</option>
          <option value="name">Nombre</option>
          <option value="bitrate">Bitrate</option>
        </select>
      </div>
      <div style={{ flex: '1 1 120px', display: 'flex', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={filters.hidebroken}
            onChange={(e) => updateFilter('hidebroken', e.target.checked)}
            style={{ accentColor: 'var(--accent-primary)' }}
          />
          Solo activas
        </label>
      </div>
    </div>
  );
}
