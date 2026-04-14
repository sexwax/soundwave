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
      style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      <form onSubmit={onSearch} style={{ flex: 1, maxWidth: 400 }}>
        <Input
          placeholder="Buscar emisoras, géneros..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%' }}
          aria-label="Búsqueda global"
        />
      </form>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
        SoundWave v1.0
      </div>
    </header>
  );
}
