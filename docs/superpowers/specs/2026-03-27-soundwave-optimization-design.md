# SoundWave — Optimization & Bug Fix Design

**Date:** 2026-03-27
**Scope:** Fix broken functionality + wire installed-but-unused dependencies

---

## Summary

Three independent domains of work. Each domain can be implemented and tested in isolation.

---

## Domain 1 — Player (fix + enhance)

### Problem
Local audio playback is completely non-functional:
- `useAudioEngine.ts` exists but is never called in `LocalPlayer.tsx`
- `useLocalFiles.ts` reads `File` objects but discards them — no way to play them back
- Equalizer preset selection has no visual feedback (state not tracked)
- Shuffle and repeat-track modes don't affect actual playback order

### Solution

**`useLocalFiles.ts`**
- Add module-scope `fileMap: Map<string, File>` to store `File` objects keyed by `filePath`
- Export `getFile(path: string): File | undefined` for use by audio engine
- Call `parseBlob(file)` from `music-metadata-browser` on each file to extract: `title`, `artist`, `album`, `duration`, `coverArt` (first picture converted to base64 data URL)
- Fallback: if metadata parse fails, use filename (without extension) as title, duration 0

**`useAudioEngine.ts`**
- Manages a single active `Howl` instance
- On `currentTrack` change: call `URL.createObjectURL(getFile(path))`, create `Howl` with detected format (by file extension), wire `onplay/onend/onseek/onstop` to playerStore actions
- On track end: call `nextTrack()` from playerStore
- On unmount or track change: revoke previous object URL with `URL.revokeObjectURL()`
- Crossfade: when `currentTime >= duration - crossfadeDuration`, start fade-out on current Howl and trigger next track with fade-in. Only active when `crossfadeDuration > 0`
- Expose: `seek(seconds)`, `setVolume(v)`, `setMute(m)` — called from MiniPlayer

**`LocalPlayer.tsx`**
- Call `useAudioEngine()` at component top level (currently missing entirely)

**`Equalizer.tsx`**
- Add `const [activePreset, setActivePreset] = useState<string>('flat')`
- On preset button click: call existing `applyPreset()` AND `setActivePreset(name)`
- Highlight active preset button with `variant="primary"` vs `variant="outline"`

**`playerStore.ts`**
- `nextTrack()`: if `isShuffled`, advance through `shuffledQueue` order; if `repeatMode === 'track'`, keep same index (trigger re-play via a `playTrigger` counter)
- `prevTrack()`: symmetric logic
- Add `playTrigger: number` field (incremented on repeat-track) so `useAudioEngine` can react to re-play same track

---

## Domain 2 — Radio/Favorites (fix + sharing)

### Problem
- "Escuchar" from FavoritesList sets store state but never creates a Howl — no audio plays
- No sharing functionality despite `qrcode` being installed
- No dynamic meta tags despite `react-helmet-async` being installed

### Solution

**`FavoritesList.tsx`**
- Replace `playStation()` local function with `navigate('/station/' + fav.stationuuid)`
- This reuses the deep-link route `/station/:uuid` already handled in `RadioPage.tsx` (`useParams` → `playStation(station)`)
- Remove `setCurrentStation/setIsPlaying/setStatus` direct calls from this component

**`SharePanel.tsx`** (new: `src/modules/radio/components/SharePanel.tsx`)
- Props: `station: RadioStation`, `onClose: () => void`
- On mount: call `QRCode.toDataURL(shareUrl)` where `shareUrl = ${import.meta.env.VITE_APP_URL}/station/${station.stationuuid}` (fallback to `window.location.origin` if env var not set)
- Render: QR image + station name + "Copiar enlace" button (uses `navigator.clipboard.writeText`)
- Wrapped in existing `Modal` component

**`RadioPage.tsx`**
- Add share button (icon) to the current station status bar
- Opens `SharePanel` in a Modal when clicked

**`react-helmet-async`**
- Add `<HelmetProvider>` wrapping in `src/app/App.tsx`
- `PlayerPage`: `<Helmet><title>SoundWave — Reproductor</title></Helmet>`
- `RadioPage`: `<Helmet><title>{currentStation ? currentStation.name + ' — SoundWave' : 'Radio — SoundWave'}</title><meta property="og:title" .../></Helmet>`
- `FavoritesPage`, `RecorderPage`: static Helmet titles

---

## Domain 3 — Shared (animations + virtualization)

### Problem
- `framer-motion` installed but no animations
- `@tanstack/react-virtual` installed but TrackList renders all items (performance issue with large libraries)

### Solution

**`Router.tsx`**
- Wrap route outlet with `<AnimatePresence mode="wait">`
- Each lazy-loaded page component: wrap root element with `<motion.div>` using:
  ```
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  ```
- Use `useLocation().pathname` as `key` on `AnimatePresence` child

**`StationCard.tsx`**
- Wrap card `div` with `motion.div`
- Accept optional `index?: number` prop
- `initial={{ opacity: 0, scale: 0.97 }}`, `animate={{ opacity: 1, scale: 1 }}`, `transition={{ delay: Math.min(index * 0.03, 0.6) }}`
- Stagger capped at 20 items (index > 20 uses delay 0) to avoid performance degradation

**`NotificationProvider.tsx`**
- Wrap each toast with `motion.div`
- `initial={{ opacity: 0, x: 40 }}`, `animate={{ opacity: 1, x: 0 }}`, `exit={{ opacity: 0, x: 40 }}`
- Use `AnimatePresence` around the toast list

**`TrackList.tsx`**
- Use `useVirtualizer` from `@tanstack/react-virtual`
- `estimateSize: () => 52` (matches current row height)
- Only activate when `queue.length > 100`; below threshold render normally to keep simple cases simple
- Requires a fixed-height scrollable container ref

---

## Out of Scope

The following installed dependencies are NOT implemented in this plan (not part of original spec's core functionality):
- `lamejs` — MP3 re-encoding in Recorder (complex, marginal value)
- `hls.js` — Howler already handles HLS via `format: ['m3u8']`

The following bugs are noted but not fixed here (separate concerns):
- Spinner inline style tag deduplication
- Stream check hardcoded timeout
- Weak random IDs in Recorder

---

## Implementation Order

1. Domain 1 (Player) — highest risk, most files changed, test manually after
2. Domain 2 (Radio/Favorites) — medium risk, shares no files with Domain 1
3. Domain 3 (Shared) — lowest risk, purely additive, no logic changes
