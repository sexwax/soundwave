import { useState } from 'react';
import { Input } from '../../../shared/components/ui/Input';
import { Button } from '../../../shared/components/ui/Button';
import { useRadioBrowser } from '../hooks/useRadioBrowser';
import { useRadioStore } from '../store/radioStore';
import { StationFilters } from './StationFilters';

export function RadioSearch() {
  const { search, loadTopStations, error } = useRadioBrowser();
  const { searchQuery, setSearchQuery, filters, isLoading, stations } = useRadioStore();
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    search({
      name: searchQuery,
      country: filters.country,
      language: filters.language,
      bitrateMin: filters.bitrateMin,
      codec: filters.codec,
      hidebroken: filters.hidebroken,
      order: filters.order,
      limit: 50,
    });
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="search-form" style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <Input
          placeholder="Buscar emisoras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 150 }}
          aria-label="Buscar emisoras"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '...' : '🔍 Buscar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)}>
          ⚙️ Filtros
        </Button>
        <Button type="button" variant="ghost" onClick={loadTopStations} disabled={isLoading}>
          🔥 Top
        </Button>
      </form>
      {showFilters && <StationFilters />}
      {error && (
        <div style={{ color: 'var(--accent-danger)', fontSize: 13, padding: 8 }}>
          Error: {error}
        </div>
      )}
      {hasSearched && !isLoading && !error && stations.length === 0 && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 8 }}>
          No se encontraron emisoras. Intenta con otros términos o filtros.
        </div>
      )}
    </div>
  );
}
