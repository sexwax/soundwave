import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../db/favoritesDb';
import type { FavoriteStation, Collection, PlayHistory } from '../db/favoritesDb';

interface FavoritesState {
  favorites: FavoriteStation[];
  collections: Collection[];
  history: PlayHistory[];
  load: () => Promise<void>;
  addFavorite: (station: Omit<FavoriteStation, 'id' | 'addedAt'>) => void;
  removeFavorite: (stationuuid: string) => void;
  isFavorite: (stationuuid: string) => boolean;
  addCollection: (name: string, color: string) => Promise<void>;
  removeCollection: (id: number) => Promise<void>;
  addHistory: (entry: Omit<PlayHistory, 'id' | 'playedAt'>) => Promise<void>;
  saveDirHandle: (key: string, handle: FileSystemDirectoryHandle) => Promise<void>;
  getDirHandle: (key: string) => Promise<FileSystemDirectoryHandle | undefined>;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      collections: [],
      history: [],

      // Carga history y collections desde Dexie; favorites vienen de localStorage via persist
      load: async () => {
        try {
          const [collections, history] = await Promise.all([
            db.collections.orderBy('createdAt').toArray(),
            db.history.orderBy('playedAt').reverse().limit(500).toArray(),
          ]);
          set({ collections, history });
        } catch {
          // Dexie no disponible, continuar sin historial
        }
      },

      addFavorite: (station) => {
        // Evitar duplicados
        if (get().favorites.some((f) => f.stationuuid === station.stationuuid)) return;
        set((s) => ({
          favorites: [{ ...station, addedAt: new Date() }, ...s.favorites],
        }));
      },

      removeFavorite: (stationuuid) => {
        set((s) => ({
          favorites: s.favorites.filter((f) => f.stationuuid !== stationuuid),
        }));
      },

      isFavorite: (stationuuid) =>
        get().favorites.some((f) => f.stationuuid === stationuuid),

      addCollection: async (name, color) => {
        await db.collections.add({ name, color, createdAt: new Date() });
        const collections = await db.collections.orderBy('createdAt').toArray();
        set({ collections });
      },

      removeCollection: async (id) => {
        await db.collections.delete(id);
        const collections = await db.collections.orderBy('createdAt').toArray();
        set({ collections });
      },

      addHistory: async (entry) => {
        try {
          await db.history.add({ ...entry, playedAt: new Date() });
          const history = await db.history.orderBy('playedAt').reverse().limit(500).toArray();
          set({ history });
        } catch {
          // Ignorar errores de historial
        }
      },

      saveDirHandle: async (key, handle) => {
        try {
          await db.handles.put({ key, handle });
        } catch {
          // IndexedDB no disponible — "Reabrir última carpeta" simplemente no aparecerá
        }
      },

      getDirHandle: async (key) => {
        try {
          const entry = await db.handles.get(key);
          return entry?.handle;
        } catch {
          return undefined;
        }
      },
    }),
    {
      name: 'soundwave-favorites',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);
