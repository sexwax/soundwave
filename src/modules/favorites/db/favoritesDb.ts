import Dexie, { type Table } from 'dexie';

export interface FavoriteStation {
  id?: number;
  stationuuid: string;
  name: string;
  url: string;
  favicon: string;
  country: string;
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

class SoundWaveDB extends Dexie {
  favorites!: Table<FavoriteStation>;
  collections!: Table<Collection>;
  history!: Table<PlayHistory>;
  tracks!: Table<LocalTrack>;

  constructor() {
    super('SoundWaveDB');
    this.version(1).stores({
      favorites: '++id, stationuuid, collectionId, addedAt',
      collections: '++id, name',
      history: '++id, playedAt, type',
      tracks: '++id, &filePath, artist, album, addedAt',
    });
  }
}

export const db = new SoundWaveDB();
