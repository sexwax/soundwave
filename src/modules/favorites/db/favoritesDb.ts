import Dexie, { type Table } from 'dexie';

export interface FavoriteStation {
  id?: number;
  stationuuid: string;
  name: string;
  url: string;
  favicon: string;
  country: string;
  /** Optional: favorites saved before this field existed show 🌐 instead of a flag. */
  countrycode?: string;
  language: string;
  tags: string;
  bitrate: number;
  codec: string;
  collectionId?: number;
  addedAt: Date;
}

export interface Collection {
  id?: number;
  name: string;
  color: string;
  createdAt: Date;
}

export interface PlayHistory {
  id?: number;
  type: 'local' | 'radio';
  title: string;
  artist?: string;
  stationuuid?: string;
  filePath?: string;
  playedAt: Date;
  durationMs?: number;
}

export interface LocalTrack {
  id?: number;
  filePath: string;
  /** Path relative to the opened directory, used to sort the queue by folder structure. */
  relativePath?: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  coverUrl?: string;
  lastModified: number;
  addedAt: Date;
}

export interface DirHandleEntry {
  key: string;
  handle: FileSystemDirectoryHandle;
}

class SoundWaveDB extends Dexie {
  favorites!: Table<FavoriteStation>;
  collections!: Table<Collection>;
  history!: Table<PlayHistory>;
  tracks!: Table<LocalTrack>;
  handles!: Table<DirHandleEntry>;

  constructor() {
    super('SoundWaveDB');
    this.version(1).stores({
      favorites: '++id, stationuuid, collectionId, addedAt',
      collections: '++id, name',
      history: '++id, playedAt, type',
      tracks: '++id, &filePath, artist, album, addedAt',
    });
    this.version(2).stores({
      handles: 'key',
    });
  }
}

export const db = new SoundWaveDB();
