import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Spinner } from '../shared/components/ui/Spinner';

const PlayerPage = lazy(() => import('../pages/PlayerPage'));
const RadioPage = lazy(() => import('../pages/RadioPage'));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage'));
const RecorderPage = lazy(() => import('../pages/RecorderPage'));

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Spinner size={32} />
  </div>
);

export function AppRouter() {
  const location = useLocation();
  return (
    <Suspense fallback={<Loading />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PlayerPage />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/station/:uuid" element={<RadioPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/recorder" element={<RecorderPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
