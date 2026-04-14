import { Helmet } from 'react-helmet-async';
import { FavoritesList } from '../modules/favorites/components/FavoritesList';
import { PageTransition } from '../shared/components/layout/PageTransition';

export default function FavoritesPage() {
  return (
    <PageTransition>
    <div>
      <Helmet><title>Favoritos — SoundWave</title></Helmet>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent-primary)', marginBottom: 20 }}>
        ❤️ Favoritos e historial
      </h2>
      <FavoritesList />
    </div>
    </PageTransition>
  );
}
