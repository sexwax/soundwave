import { useState, useCallback, useEffect } from 'react';
import { parseBlob } from 'music-metadata-browser';
import type { LocalTrack } from '../../favorites/db/favoritesDb';
import { usePlayerStore } from '../store/playerStore';
import { registerFile, releaseFiles } from '../services/localEngine';
import { useFavoritesStore } from '../../favorites/store/favoritesStore';
import { notify } from '../../../shared/utils/notify';

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.opus', '.aac', '.m4a'];
const PARSE_CONCURRENCY = 6;
const LAST_DIRECTORY_KEY = 'lastDirectory';

interface DiscoveredFile {
  file: File;
  relativePath: string;
}

export interface IndexProgress {
  done: number;
  total: number;
}

function isAudioFile(name: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

function supportsDirectoryPicker(): boolean {
  return 'showDirectoryPicker' in window;
}

async function readFilesFromHandle(dirHandle: FileSystemDirectoryHandle, prefix = ''): Promise<DiscoveredFile[]> {
  const results: DiscoveredFile[] = [];
  for await (const entry of dirHandle.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'file' && isAudioFile(entry.name)) {
      const file = await entry.getFile();
      results.push({ file, relativePath: path });
    } else if (entry.kind === 'directory') {
      const sub = await readFilesFromHandle(entry, path);
      results.push(...sub);
    }
  }
  return results;
}

async function parseTrack(file: File, relativePath: string): Promise<LocalTrack> {
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
    relativePath,
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

/** Parses files with a bounded worker pool so huge folders don't hang the tab. */
async function parseWithConcurrency(
  files: DiscoveredFile[],
  onProgress: (progress: IndexProgress) => void,
): Promise<LocalTrack[]> {
  const results: LocalTrack[] = new Array(files.length);
  let nextIndex = 0;
  let done = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex++;
      if (i >= files.length) return;
      results[i] = await parseTrack(files[i].file, files[i].relativePath);
      done++;
      onProgress({ done, total: files.length });
    }
  }

  const workerCount = Math.min(PARSE_CONCURRENCY, files.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results.sort((a, b) => (a.relativePath ?? '').localeCompare(b.relativePath ?? ''));
}

function pickFilesViaInput(directory: boolean): Promise<DiscoveredFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (directory) {
      input.webkitdirectory = true;
    } else {
      input.accept = AUDIO_EXTENSIONS.join(',');
    }
    input.onchange = () => {
      const files = Array.from(input.files ?? []).filter((f) => isAudioFile(f.name));
      resolve(files.map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
      })));
    };
    input.click();
  });
}

export function useLocalFiles() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);
  const [hasSavedDirHandle, setHasSavedDirHandle] = useState(false);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const appendToQueue = usePlayerStore((s) => s.appendToQueue);

  useEffect(() => {
    if (!supportsDirectoryPicker()) return;
    void useFavoritesStore.getState().getDirHandle(LAST_DIRECTORY_KEY).then((handle) => {
      setHasSavedDirHandle(!!handle);
    });
  }, []);

  const indexFiles = useCallback(async (discovered: DiscoveredFile[], mode: 'replace' | 'append') => {
    if (discovered.length === 0) {
      notify('No se encontraron archivos de audio.', 'warning');
      return;
    }
    setIsIndexing(true);
    setIndexProgress({ done: 0, total: discovered.length });
    try {
      const tracks = await parseWithConcurrency(discovered, setIndexProgress);
      if (mode === 'replace') {
        setQueue(tracks, 0);
        releaseFiles(new Set(tracks.map((t) => t.filePath)));
      } else {
        appendToQueue(tracks);
      }
    } finally {
      setIsIndexing(false);
      setIndexProgress(null);
    }
  }, [setQueue, appendToQueue]);

  const openDirectory = useCallback(async () => {
    if (!supportsDirectoryPicker()) {
      const discovered = await pickFilesViaInput(true);
      await indexFiles(discovered, 'replace');
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker();
      const discovered = await readFilesFromHandle(dirHandle);
      await indexFiles(discovered, 'replace');
      void useFavoritesStore.getState().saveDirHandle(LAST_DIRECTORY_KEY, dirHandle);
      setHasSavedDirHandle(true);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        notify('Error al leer la carpeta: ' + (err as Error).message, 'error');
      }
    }
  }, [indexFiles]);

  const reopenLastDirectory = useCallback(async () => {
    const handle = await useFavoritesStore.getState().getDirHandle(LAST_DIRECTORY_KEY);
    if (!handle) return;
    try {
      const permission = await handle.requestPermission({ mode: 'read' });
      if (permission !== 'granted') {
        notify('Permiso denegado para reabrir la carpeta.', 'warning');
        return;
      }
      const discovered = await readFilesFromHandle(handle);
      await indexFiles(discovered, 'replace');
    } catch (err) {
      notify('No se pudo reabrir la carpeta: ' + (err as Error).message, 'error');
    }
  }, [indexFiles]);

  const openFiles = useCallback(async () => {
    const discovered = await pickFilesViaInput(false);
    await indexFiles(discovered, 'replace');
  }, [indexFiles]);

  const appendFiles = useCallback(async () => {
    const discovered = await pickFilesViaInput(false);
    await indexFiles(discovered, 'append');
  }, [indexFiles]);

  return {
    openDirectory,
    openFiles,
    appendFiles,
    reopenLastDirectory,
    isIndexing,
    indexProgress,
    hasSavedDirHandle: hasSavedDirHandle && supportsDirectoryPicker(),
  };
}
