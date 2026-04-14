# SoundWave Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken local audio playback, wire unused dependencies (music-metadata-browser, qrcode, react-helmet-async, framer-motion, react-virtual), and repair shuffle/repeat/EQ preset logic.

**Architecture:** Three independent domains executed in order — Domain 1 (Player engine fixes), Domain 2 (Radio sharing + favorites fix), Domain 3 (Animations + virtualisation). Each task produces a working, independently testable change.

**Tech Stack:** React 19, TypeScript, Zustand 5, Howler.js, Dexie 4, music-metadata-browser 2, framer-motion 12, @tanstack/react-virtual 3, qrcode 1, react-helmet-async 3, react-router-dom 7

---

## Domain 1 — Player Engine

### Task 1: playerStore — fix shuffle, repeat-track, and add playTrigger

**Files:**
- Modify: `src/modules/player/store/playerStore.ts`

- [ ] **Step 1: Add `playTrigger` to interface and initial state**

Open `src/modules/player/store/playerStore.ts`. Replace the `interface PlayerState` block and initial state:

```typescript
interface PlayerState {
  queue: LocalTrack[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  balance: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  shuffledQueue: LocalTrack[];
  crossfadeDuration: number;
  currentTime: number;
  duration: number;
  playTrigger: number;
  setQueue: (tracks: LocalTrack[], startIndex?: number) => void;
  setCurrentIndex: (index: number) => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
  setBalance: (v: number) => void;
  setRepeatMode: (v: RepeatMode) => void;
  toggleShuffle: () => void;
  setCrossfade: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  currentTrack: () => LocalTrack | null;
}
```

In the `create<PlayerState>` call, add `playTrigger: 0` to the initial values (after `duration: 0`).

- [ ] **Step 2: Fix `currentTrack()` to use shuffledQueue when shuffled**

Replace the existing `currentTrack` method:

```typescript
currentTrack: () => {
  const { queue, shuffledQueue, currentIndex, isShuffled } = get();
  const active = isShuffled && shuffledQueue.length === queue.length ? shuffledQueue : queue;
  return active[currentIndex] ?? null;
},
```

- [ ] **Step 3: Fix `nextTrack()` for repeat-track and shuffle**

Replace the existing `nextTrack` method:

```typescript
nextTrack: () => {
  const { queue, currentIndex, repeatMode } = get();
  if (repeatMode === 'track') {
    set((s) => ({ playTrigger: s.playTrigger + 1 }));
    return;
  }
  if (currentIndex < queue.length - 1) set({ currentIndex: currentIndex + 1 });
  else if (repeatMode === 'queue') set({ currentIndex: 0 });
  else set({ isPlaying: false });
},
```

- [ ] **Step 4: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/player/store/playerStore.ts && git commit -m "fix(player): add playTrigger, fix shuffle currentTrack, fix repeat-track"
```

---

### Task 2: useLocalFiles — register File objects + extract ID3 metadata

**Files:**
- Modify: `src/modules/player/hooks/useLocalFiles.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
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
      const blob = new Blob([pic.data], { type: pic.format });
      coverUrl = URL.createObjectURL(blob);
    }
  } catch {
    // Fall back to filename-derived values — already set above
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
      let files: File[] = [];

      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        files = await readFilesFromHandle(dirHandle);
      } else {
        return;
      }

      const tracks = await Promise.all(files.map(parseTrack));

      for (const track of tracks) {
        const existing = await db.tracks.where('filePath').equals(track.filePath).first();
        if (!existing) await db.tracks.add(track);
      }

      setQueue(tracks);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error(e);
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
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/player/hooks/useLocalFiles.ts && git commit -m "feat(player): extract ID3 metadata and register files for playback"
```

---

### Task 3: useAudioEngine — add track-change effect + crossfade support

**Files:**
- Modify: `src/modules/player/hooks/useAudioEngine.ts`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { usePlayerStore } from '../store/playerStore';

// Module-scope file registry: filePath → object URL
const fileMap = new Map<string, string>();

export function registerFile(filePath: string, file: File) {
  if (!fileMap.has(filePath)) {
    fileMap.set(filePath, URL.createObjectURL(file));
  }
}

export function getFileUrl(filePath: string): string | undefined {
  return fileMap.get(filePath);
}

export function useAudioEngine() {
  const howlRef = useRef<Howl | null>(null);
  const { isPlaying, volume, isMuted, crossfadeDuration, playTrigger,
    setIsPlaying, setCurrentTime, setDuration, nextTrack,
  } = usePlayerStore();

  // Shuffle-aware current track selector
  const currentTrack = usePlayerStore((s) => {
    const active = s.isShuffled && s.shuffledQueue.length === s.queue.length
      ? s.shuffledQueue
      : s.queue;
    return active[s.currentIndex] ?? null;
  });

  // Refs so callbacks always read latest values without re-creating
  const volumeRef = useRef(isMuted ? 0 : volume);
  const crossfadeRef = useRef(crossfadeDuration);
  const durationRef = useRef(0);

  useEffect(() => { volumeRef.current = isMuted ? 0 : volume; }, [volume, isMuted]);
  useEffect(() => { crossfadeRef.current = crossfadeDuration; }, [crossfadeDuration]);

  const loadAndPlay = useCallback((url: string) => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    const cf = crossfadeRef.current;
    const targetVol = volumeRef.current;

    const howl = new Howl({
      src: [url],
      html5: true,
      volume: cf > 0 ? 0 : targetVol,
      onplay: () => {
        setIsPlaying(true);
        if (cf > 0) howl.fade(0, targetVol, cf * 1000);
      },
      onpause: () => setIsPlaying(false),
      onend: () => nextTrack(),
      onload: () => {
        const dur = howl.duration();
        durationRef.current = dur;
        setDuration(dur);
      },
      onloaderror: (_: any, err: any) => console.error('Load error', err),
    });
    howlRef.current = howl;
    howl.play();
  }, [setIsPlaying, setDuration, nextTrack]);

  // Stable ref to always call the latest loadAndPlay
  const loadAndPlayRef = useRef(loadAndPlay);
  useEffect(() => { loadAndPlayRef.current = loadAndPlay; }, [loadAndPlay]);

  // Trigger load when track changes or repeat-track fires
  useEffect(() => {
    if (!currentTrack) return;
    const url = getFileUrl(currentTrack.filePath);
    if (url) loadAndPlayRef.current(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.filePath, playTrigger]);

  // Sync isPlaying state (external pause/play without track change)
  useEffect(() => {
    if (!howlRef.current) return;
    if (isPlaying && !howlRef.current.playing()) howlRef.current.play();
    else if (!isPlaying && howlRef.current.playing()) howlRef.current.pause();
  }, [isPlaying]);

  // Volume changes
  useEffect(() => {
    const v = isMuted ? 0 : volume;
    if (howlRef.current) howlRef.current.volume(v);
    Howler.volume(v);
  }, [volume, isMuted]);

  // Time polling + crossfade fade-out
  useEffect(() => {
    const id = setInterval(() => {
      const h = howlRef.current;
      if (!h?.playing()) return;
      const t = h.seek() as number;
      setCurrentTime(t);
      const cf = crossfadeRef.current;
      const dur = durationRef.current;
      if (cf > 0 && dur > 0) {
        const remaining = dur - t;
        if (remaining > 0 && remaining <= cf) {
          h.volume((remaining / cf) * volumeRef.current);
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [setCurrentTime]);

  const seek = useCallback((seconds: number) => {
    howlRef.current?.seek(seconds);
    setCurrentTime(seconds);
  }, [setCurrentTime]);

  return { seek, howlRef };
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/player/hooks/useAudioEngine.ts && git commit -m "fix(player): wire track-change effect and crossfade in audio engine"
```

---

### Task 4: LocalPlayer — call useAudioEngine

**Files:**
- Modify: `src/modules/player/components/LocalPlayer.tsx`

- [ ] **Step 1: Add the import and hook call**

At the top of `src/modules/player/components/LocalPlayer.tsx`, add the import after the existing imports:

```typescript
import { useAudioEngine } from '../hooks/useAudioEngine';
```

Inside the `LocalPlayer` function body, add this line immediately after the existing hook calls (after line `const [visMode, setVisMode] = useState...`):

```typescript
useAudioEngine();
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Manual smoke test**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run dev
```

Open `http://localhost:5173`, go to Reproductor, open an audio file, click a track — audio should play. MiniPlayer progress bar should update.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/player/components/LocalPlayer.tsx && git commit -m "fix(player): wire useAudioEngine into LocalPlayer — local playback now works"
```

---

### Task 5: Equalizer — track active preset with state

**Files:**
- Modify: `src/modules/player/components/Equalizer.tsx`

- [ ] **Step 1: Replace the entire file content**

```typescript
import { useState } from 'react';
import { useAudioContext } from '../../../app/providers/AudioProvider';
import { Button } from '../../../shared/components/ui/Button';

const BANDS = [32, 64, 125, 250, 500, '1k', '2k', '4k', '8k', '16k'];

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  Rock: [6, 4, 2, 0, -2, 0, 2, 4, 4, 4],
  Jazz: [4, 2, 0, 2, -2, -2, 0, 2, 4, 4],
  Pop: [-2, -1, 2, 4, 4, 3, 1, -1, -2, -2],
  Classical: [4, 4, 2, 0, -2, -2, 0, 2, 4, 4],
};

export function Equalizer() {
  const { eqNodes } = useAudioContext();
  const [activePreset, setActivePreset] = useState<string>('Flat');
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const applyPreset = (name: string, values: number[]) => {
    values.forEach((gain, i) => {
      if (eqNodes[i]) eqNodes[i].gain.value = gain;
    });
    setActivePreset(name);
    setGains([...values]);
  };

  const setGain = (index: number, value: number) => {
    if (eqNodes[index]) eqNodes[index].gain.value = value;
    setGains((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setActivePreset('Custom');
  };

  return (
    <div style={{
      background: 'var(--bg-elevated)', borderRadius: 12, padding: 16,
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14 }}>Ecualizador</h4>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(PRESETS).map(([name, values]) => (
            <Button
              key={name}
              variant={activePreset === name ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => applyPreset(name, values)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {BANDS.map((freq, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <input
              type="range"
              min={-12} max={12} step={0.5}
              value={gains[i]}
              style={{ height: 80, accentColor: 'var(--accent-primary)', writingMode: 'vertical-lr', direction: 'rtl', cursor: 'pointer', WebkitAppearance: 'slider-vertical' } as any}
              onChange={(e) => setGain(i, Number(e.target.value))}
              aria-label={`Banda ${freq}Hz`}
            />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {freq}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/player/components/Equalizer.tsx && git commit -m "fix(player): track active EQ preset with state, sliders reflect values"
```

---

## Domain 2 — Radio / Favorites

### Task 6: FavoritesList — fix playback via navigate

**Files:**
- Modify: `src/modules/favorites/components/FavoritesList.tsx`

- [ ] **Step 1: Replace the import block and playStation function**

At the top of `src/modules/favorites/components/FavoritesList.tsx`, replace:

```typescript
import { useEffect } from 'react';
import { useFavoritesStore } from '../store/favoritesStore';
import { useRadioStore } from '../../radio/store/radioStore';
import { flagEmoji } from '../../../shared/utils/formatters';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
```

with:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavoritesStore } from '../store/favoritesStore';
import { flagEmoji } from '../../../shared/utils/formatters';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
```

Inside `FavoritesList()`, replace the hook calls and `playStation` function:

```typescript
export function FavoritesList() {
  const { favorites, history, load, removeFavorite } = useFavoritesStore();
  const navigate = useNavigate();

  useEffect(() => { load(); }, [load]);

  const playStation = (fav: typeof favorites[0]) => {
    navigate('/station/' + fav.stationuuid);
  };
```

- [ ] **Step 2: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/favorites/components/FavoritesList.tsx && git commit -m "fix(favorites): navigate to /station/:uuid so Howl is created in RadioPage"
```

---

### Task 7: SharePanel — new component + wire to RadioPage

**Files:**
- Create: `src/modules/radio/components/SharePanel.tsx`
- Modify: `src/pages/RadioPage.tsx`

- [ ] **Step 1: Create SharePanel component**

Create `src/modules/radio/components/SharePanel.tsx`:

```typescript
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { RadioStation } from '../store/radioStore';
import { Button } from '../../../shared/components/ui/Button';
import { Spinner } from '../../../shared/components/ui/Spinner';

interface Props {
  station: RadioStation;
}

export function SharePanel({ station }: Props) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const shareUrl =
    (import.meta.env.VITE_APP_URL ?? window.location.origin) +
    '/station/' +
    station.stationuuid;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 180, margin: 2, color: { dark: '#00e5ff', light: '#080b12' } })
      .then(setQrUrl)
      .catch(console.error);
  }, [shareUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        {station.name}
      </div>

      {qrUrl ? (
        <img src={qrUrl} alt="QR" style={{ borderRadius: 8, width: 180, height: 180 }} />
      ) : (
        <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} />
        </div>
      )}

      <div style={{
        fontSize: 11, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)',
        wordBreak: 'break-all', textAlign: 'center', maxWidth: 240,
      }}>
        {shareUrl}
      </div>

      <Button onClick={copyLink} variant={copied ? 'primary' : 'outline'} size="sm">
        {copied ? '✓ Copiado' : '📋 Copiar enlace'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add share button and modal to RadioPage**

In `src/pages/RadioPage.tsx`, add the import at the top:

```typescript
import { SharePanel } from '../modules/radio/components/SharePanel';
```

In the component body, add `showShare` state after `selectedStation`:

```typescript
const [showShare, setShowShare] = useState(false);
```

In the current station status bar (the `div` that contains the `⏹ Stop` button), add a share button before the Stop button:

```tsx
<button
  onClick={() => setShowShare(true)}
  style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}
>
  🔗 Compartir
</button>
```

After the existing Station detail Modal, add:

```tsx
{/* Share modal */}
<Modal
  open={showShare}
  onClose={() => setShowShare(false)}
  title="Compartir emisora"
>
  {currentStation && showShare && (
    <SharePanel station={currentStation} />
  )}
</Modal>
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/radio/components/SharePanel.tsx src/pages/RadioPage.tsx && git commit -m "feat(radio): add SharePanel with QR code and copy-link"
```

---

### Task 8: react-helmet-async — HelmetProvider + page meta tags

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/pages/PlayerPage.tsx`
- Modify: `src/pages/RadioPage.tsx`
- Modify: `src/pages/FavoritesPage.tsx`
- Modify: `src/pages/RecorderPage.tsx`

- [ ] **Step 1: Add HelmetProvider to App.tsx**

In `src/app/App.tsx`, add the import:

```typescript
import { HelmetProvider } from 'react-helmet-async';
```

Wrap the existing `<BrowserRouter>` with `<HelmetProvider>`:

```tsx
export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AudioProvider>
            <NotificationProvider>
              <AppInner />
            </NotificationProvider>
          </AudioProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
```

- [ ] **Step 2: Add Helmet to PlayerPage**

In `src/pages/PlayerPage.tsx`, add:

```typescript
import { Helmet } from 'react-helmet-async';
```

Inside the return, add as first child of the outer div:

```tsx
<Helmet>
  <title>SoundWave — Reproductor</title>
  <meta property="og:title" content="SoundWave — Reproductor" />
  <meta property="og:description" content="Reproduce tus archivos de música locales" />
</Helmet>
```

- [ ] **Step 3: Add Helmet to RadioPage**

In `src/pages/RadioPage.tsx`, add:

```typescript
import { Helmet } from 'react-helmet-async';
```

Inside the return div, add as first child:

```tsx
<Helmet>
  <title>{currentStation ? `${currentStation.name} — SoundWave` : 'Radio — SoundWave'}</title>
  <meta property="og:title" content={currentStation ? currentStation.name : 'Radio en línea — SoundWave'} />
  <meta property="og:description" content={currentStation ? `Escucha ${currentStation.name} en SoundWave` : 'Descubre y escucha emisoras de radio de todo el mundo'} />
</Helmet>
```

- [ ] **Step 4: Add Helmet to FavoritesPage and RecorderPage**

In `src/pages/FavoritesPage.tsx`, add:

```typescript
import { Helmet } from 'react-helmet-async';
```

Inside the return div, add first:

```tsx
<Helmet>
  <title>Favoritos — SoundWave</title>
</Helmet>
```

In `src/pages/RecorderPage.tsx`, add:

```typescript
import { Helmet } from 'react-helmet-async';
```

Inside the return, add first:

```tsx
<Helmet>
  <title>Grabador — SoundWave</title>
</Helmet>
```

- [ ] **Step 5: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/app/App.tsx src/pages/PlayerPage.tsx src/pages/RadioPage.tsx src/pages/FavoritesPage.tsx src/pages/RecorderPage.tsx && git commit -m "feat: add react-helmet-async for dynamic page titles and OG meta tags"
```

---

## Domain 3 — Animations & Virtualisation

### Task 9: framer-motion — page transitions + notification animations + station card stagger

**Files:**
- Create: `src/shared/components/layout/PageTransition.tsx`
- Modify: `src/app/Router.tsx`
- Modify: `src/pages/PlayerPage.tsx`
- Modify: `src/pages/RadioPage.tsx`
- Modify: `src/pages/FavoritesPage.tsx`
- Modify: `src/pages/RecorderPage.tsx`
- Modify: `src/app/providers/NotificationProvider.tsx`
- Modify: `src/modules/radio/components/StationCard.tsx`

- [ ] **Step 1: Create PageTransition wrapper**

Create `src/shared/components/layout/PageTransition.tsx`:

```typescript
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function PageTransition({ children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Update Router.tsx with AnimatePresence**

Replace `src/app/Router.tsx` entirely:

```typescript
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
```

- [ ] **Step 3: Wrap PlayerPage**

In `src/pages/PlayerPage.tsx`, add import:

```typescript
import { PageTransition } from '../shared/components/layout/PageTransition';
```

Wrap the outer div:

```tsx
export default function PlayerPage() {
  return (
    <PageTransition>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Helmet>
          <title>SoundWave — Reproductor</title>
          <meta property="og:title" content="SoundWave — Reproductor" />
          <meta property="og:description" content="Reproduce tus archivos de música locales" />
        </Helmet>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 20, color: 'var(--accent-primary)' }}>
          🎵 Reproductor local
        </h2>
        <div style={{ flex: 1, minHeight: 0 }}>
          <LocalPlayer />
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 4: Wrap RadioPage, FavoritesPage, RecorderPage**

In `src/pages/RadioPage.tsx`, add import:
```typescript
import { PageTransition } from '../shared/components/layout/PageTransition';
```
Wrap the root `<div style={{ display: 'flex', flexDirection: 'column', ... }}>` with `<PageTransition>...</PageTransition>`.

In `src/pages/FavoritesPage.tsx`, add import:
```typescript
import { PageTransition } from '../shared/components/layout/PageTransition';
```
Wrap the root `<div>` with `<PageTransition>...</PageTransition>`.

In `src/pages/RecorderPage.tsx`, add the same import and wrap.

- [ ] **Step 5: Animate notifications in NotificationProvider**

In `src/app/providers/NotificationProvider.tsx`, add imports:

```typescript
import { AnimatePresence, motion } from 'framer-motion';
```

Replace the toast map from:

```tsx
{toasts.map((t) => (
  <div key={t.id} onClick={...} style={...}>
    {t.message}
  </div>
))}
```

to:

```tsx
<AnimatePresence>
  {toasts.map((t) => (
    <motion.div
      key={t.id}
      onClick={() => removeToast(t.id)}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2 }}
      style={{
        padding: '10px 16px',
        borderRadius: '8px',
        background:
          t.type === 'error'
            ? 'var(--accent-danger)'
            : t.type === 'success'
            ? 'var(--accent-success)'
            : t.type === 'warning'
            ? 'var(--accent-warning)'
            : 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--font-mono)',
        maxWidth: '320px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {t.message}
    </motion.div>
  ))}
</AnimatePresence>
```

- [ ] **Step 6: Add stagger animation to StationCard**

In `src/modules/radio/components/StationCard.tsx`, add import:

```typescript
import { motion } from 'framer-motion';
```

Add `index?: number` to the `Props` interface:

```typescript
interface Props {
  station: RadioStation;
  onClick: () => void;
  index?: number;
}
```

Update function signature:

```typescript
export function StationCard({ station, onClick, index = 0 }: Props) {
```

Replace the outer `<div onClick={...}` with `<motion.div`:

```tsx
<motion.div
  onClick={onClick}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && onClick()}
  initial={{ opacity: 0, scale: 0.97 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.15, delay: index < 20 ? index * 0.03 : 0 }}
  style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    background: isActive ? 'var(--bg-elevated)' : 'transparent',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
    cursor: 'pointer',
    marginBottom: 6,
  }}
>
```

Close with `</motion.div>` instead of `</div>`.

Update `RadioPage.tsx` to pass index to each StationCard:

```tsx
stations.map((station, i) => (
  <StationCard
    key={station.stationuuid}
    station={station}
    index={i}
    onClick={() => { setSelectedStation(station); playStation(station); }}
  />
))
```

- [ ] **Step 7: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/shared/components/layout/PageTransition.tsx src/app/Router.tsx src/pages/PlayerPage.tsx src/pages/RadioPage.tsx src/pages/FavoritesPage.tsx src/pages/RecorderPage.tsx src/app/providers/NotificationProvider.tsx src/modules/radio/components/StationCard.tsx && git commit -m "feat(ui): add framer-motion page transitions, toast animations, and station card stagger"
```

---

### Task 10: TrackList — add react-virtual for large queues

**Files:**
- Modify: `src/modules/player/components/TrackList.tsx`
- Modify: `src/modules/player/components/LocalPlayer.tsx`

- [ ] **Step 1: Replace TrackList with virtualised version**

Replace `src/modules/player/components/TrackList.tsx` entirely:

```typescript
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../../../shared/utils/audioUtils';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

const VIRTUAL_THRESHOLD = 100;
const ROW_HEIGHT = 52;

function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onClick,
}: {
  track: LocalTrack;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`${track.title} por ${track.artist}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px',
        height: ROW_HEIGHT,
        borderRadius: 8,
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        cursor: 'pointer',
        color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: 28, textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)' }}>
        {isActive && isPlaying ? '▶' : index + 1}
      </div>
      {track.coverUrl && (
        <img src={track.coverUrl} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {track.artist} {track.album !== 'Unknown' && `• ${track.album}`}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-disabled)', flexShrink: 0 }}>
        {track.duration > 0 ? formatTime(track.duration) : '--:--'}
      </div>
    </div>
  );
}

export function TrackList() {
  const { queue, currentIndex, isPlaying, setCurrentIndex, setIsPlaying } = usePlayerStore();
  const parentRef = useRef<HTMLDivElement>(null);

  const playTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const virtualizer = useVirtualizer({
    count: queue.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    enabled: queue.length > VIRTUAL_THRESHOLD,
  });

  if (queue.length <= VIRTUAL_THRESHOLD) {
    // Non-virtual: TrackList owns scroll so LocalPlayer can always use overflow:hidden
    return (
      <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {queue.map((track, i) => (
            <TrackRow
              key={track.filePath}
              track={track}
              index={i}
              isActive={i === currentIndex}
              isPlaying={isPlaying}
              onClick={() => playTrack(i)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={queue[vi.index].filePath}
            style={{ position: 'absolute', top: vi.start, left: 0, right: 0, height: vi.size }}
          >
            <TrackRow
              track={queue[vi.index]}
              index={vi.index}
              isActive={vi.index === currentIndex}
              isPlaying={isPlaying}
              onClick={() => playTrack(vi.index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update LocalPlayer scroll container for virtual mode**

In `src/modules/player/components/LocalPlayer.tsx`, find the track list wrapper div:

```tsx
<div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
```

Change it to (TrackList now manages its own scroll when virtual):

```tsx
<div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
```

- [ ] **Step 3: Verify build passes**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors, all chunks generated.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/palla/claude_2/soundwave && git add src/modules/player/components/TrackList.tsx src/modules/player/components/LocalPlayer.tsx && git commit -m "feat(player): virtualise TrackList with react-virtual for queues > 100 tracks"
```

---

## Final verification

- [ ] **Full build**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run build
```

Expected: all chunks emitted, sw.js generated, 0 TypeScript errors.

- [ ] **Lint**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run lint
```

Expected: no errors.

- [ ] **Manual end-to-end smoke test**

```bash
cd C:/Users/palla/claude_2/soundwave && npm run dev
```

Verify these flows at `http://localhost:5173`:
1. Open an audio file → plays, progress bar updates, MiniPlayer shows title/artist/cover art from ID3
2. Click EQ preset → preset button highlights, sliders move
3. Enable shuffle → next/prev cycles through shuffled order
4. Enable repeat-track → same track restarts on end
5. Add a station to favorites → navigate to Favorites → click Escuchar → navigates to /station/:uuid and plays
6. On a playing radio station → click Compartir → QR code appears, copy link works
7. Navigate between pages → subtle fade+slide transition visible
8. Station cards stagger-animate on first load
9. Browser tab title updates per page/station
