import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';

export function TopBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/radio?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header
      className="topbar"
      style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <form onSubmit={onSearch} style={{ flex: 1, maxWidth: 400, display: 'flex', gap: 8 }}>
        <Input
          placeholder="Buscar emisoras..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
          aria-label="Búsqueda global"
        />
      </form>
      <div className="desktop-only" style={{ fontSize: 11, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
        SoundWave v1.0
      </div>
    </header>
  );
}
