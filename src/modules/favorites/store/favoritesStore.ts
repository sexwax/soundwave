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
  clearHistory: () => Promise<void>;
  importFavorites: (data: unknown) => number;
  saveDirHandle: (key: string, handle: FileSystemDirectoryHandle) => Promise<void>;
  getDirHandle: (key: string) => Promise<FileSystemDirectoryHandle | undefined>;
}

function isImportableFavorite(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.stationuuid === 'string' && v.stationuuid.length > 0
    && typeof v.name === 'string' && v.name.length > 0
    && typeof v.url === 'string' && v.url.length > 0;
}

/** Picks only the known FavoriteStation fields from untrusted input, with safe defaults. */
function toFavoriteStation(raw: Record<string, unknown>): Omit<FavoriteStation, 'id' | 'addedAt'> {
  return {
    stationuuid: String(raw.stationuuid),
    name: String(raw.name),
    url: String(raw.url),
    favicon: typeof raw.favicon === 'string' ? raw.favicon : '',
    country: typeof raw.country === 'string' ? raw.country : '',
    countrycode: typeof raw.countrycode === 'string' ? raw.countrycode : undefined,
    language: typeof raw.language === 'string' ? raw.language : '',
    tags: typeof raw.tags === 'string' ? raw.tags : '',
    bitrate: typeof raw.bitrate === 'number' ? raw.bitrate : 0,
    codec: typeof raw.codec === 'string' ? raw.codec : '',
  };
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
        const last = get().history[0];
        const isDuplicate = !!last && last.type === entry.type && (
          entry.type === 'local' ? last.filePath === entry.filePath : last.stationuuid === entry.stationuuid
        );
        if (isDuplicate) return;

        try {
          await db.history.add({ ...entry, playedAt: new Date() });
          const history = await db.history.orderBy('playedAt').reverse().limit(500).toArray();
          set({ history });
        } catch {
          // Ignorar errores de historial
        }
      },

      clearHistory: async () => {
        try {
          await db.history.clear();
          set({ history: [] });
        } catch {
          // Ignorar errores de historial
        }
      },

      importFavorites: (data) => {
        const list = Array.isArray(data) ? data : [data];
        const valid = list.filter(isImportableFavorite);

        // Dedup within the imported batch itself, keeping the first occurrence.
        const seenInBatch = new Set<string>();
        const deduped = valid.filter((raw) => {
          const uuid = String(raw.stationuuid);
          if (seenInBatch.has(uuid)) return false;
          seenInBatch.add(uuid);
          return true;
        });

        const known = new Set(get().favorites.map((f) => f.stationuuid));
        const fresh = deduped
          .filter((raw) => !known.has(String(raw.stationuuid)))
          .map(toFavoriteStation);
        if (fresh.length === 0) return 0;
        set((s) => ({
          favorites: [...fresh.map((f) => ({ ...f, addedAt: new Date() })), ...s.favorites],
        }));
        return fresh.length;
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
