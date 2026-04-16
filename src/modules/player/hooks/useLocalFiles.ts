import { useState, useCallback } from 'react';
import { parseBlob } from 'music-metadata-browser';
import { db, type LocalTrack } from '../../favorites/db/favoritesDb';
import { usePlayerStore } from '../store/playerStore';
import { registerFile } from './useAudioEngine';

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.opus', '.aac', '.m4a'];

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

async function readFilesFromHandle(dirHandle: FileSystemDirectoryHandle): Promise<File[]> {
  const files: File[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for await (const entry of (dirHandle as any).values()) {
    if (entry.kind === 'file' && isAudioFile(entry.name)) {
      const file = await entry.getFile();
      files.push(file);
    } else if (entry.kind === 'directory') {
      const sub = await readFilesFromHandle(entry);
      files.push(...sub);
    }
  }
  return files;
}

async function parseTrack(file: File): Promise<LocalTrack> {
  const filePath = file.name + '_' + file.lastModified;
  let title = file.name.replace(/\.[^.]+$/, '');
  let artist = 'Unknown';
  let album = 'Unknown';
  let duration = 0;
  let year: number | undefined;
  let genre: string | undefined;
  let coverUrl: string | undefined;

  try {
    const meta = await parseBlob(file, { skipCovers: false });
    if (meta.common.title) title = meta.common.title;
    if (meta.common.artist) artist = meta.common.artist;
    if (meta.common.album) album = meta.common.album;
    if (meta.format.duration) duration = meta.format.duration;
    if (meta.common.year) year = meta.common.year;
    if (meta.common.genre?.[0]) genre = meta.common.genre[0];
    const pic = meta.common.picture?.[0];
    if (pic) {
      const blob = new Blob([new Uint8Array(pic.data).buffer as ArrayBuffer], { type: pic.format });
      coverUrl = URL.createObjectURL(blob);
    }
  } catch {
    // Fall back to filename-derived values — already set above
  }

  // Fallback: use HTML5 Audio to get duration if metadata parsing failed
  if (duration <= 0) {
    duration = await new Promise<number>((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      }, { once: true });
      audio.addEventListener('error', () => {
        resolve(0);
        URL.revokeObjectURL(url);
      }, { once: true });
      audio.src = url;
    });
  }

  registerFile(filePath, file);

  return {
    filePath,
    title,
    artist,
    album,
    duration,
    year,
    genre,
    coverUrl,
    lastModified: file.lastModified,
    addedAt: new Date(),
  };
}

export function useLocalFiles() {
  const [isIndexing, setIsIndexing] = useState(false);
  const { setQueue } = usePlayerStore();

  const openDirectory = useCallback(async () => {
    setIsIndexing(true);
    try {
      // Usar SOLO el explorador de carpetas nativo del navegador
      if (!('showDirectoryPicker' in window)) {
        alert('Tu navegador no soporta la selección de carpetas. Usa Chrome, Edge o Firefox.');
        setIsIndexing(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle = await (window as any).showDirectoryPicker();
      const files = await readFilesFromHandle(dirHandle);

      if (files.length === 0) {
        alert('No se encontraron archivos de audio en esta carpeta.');
        setIsIndexing(false);
        return;
      }

      const tracks = await Promise.all(files.map(parseTrack));

      for (const track of tracks) {
        const existing = await db.tracks.where('filePath').equals(track.filePath).first();
        if (!existing) await db.tracks.add(track);
      }

      // Solo cargar la cola, NO iniciar reproducción automáticamente
      // El usuario debe pulsar play manualmente para no interrumpir radio
      setQueue(tracks, 0);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Usuario canceló - no hacer nada
      } else {
        console.error('Error al abrir carpeta:', err);
        alert('Error al leer la carpeta: ' + (err as Error).message);
      }
    } finally {
      setIsIndexing(false);
    }
  }, [setQueue]);

  const openFiles = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = AUDIO_EXTENSIONS.join(',');
    input.onchange = async () => {
      setIsIndexing(true);
      try {
        const files = Array.from(input.files ?? []);
        const tracks = await Promise.all(files.map(parseTrack));
        setQueue(tracks);
      } finally {
        setIsIndexing(false);
      }
    };
    input.click();
  }, [setQueue]);

  return { openDirectory, openFiles, isIndexing };
}
