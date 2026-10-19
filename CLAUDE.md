# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

There are two READMEs: `README.md` (English, canonical) and `README.es.md` (Spanish). They must stay in sync — same sections, same order. Any user-facing documentation change goes in both.

## Commands

```bash
npm run dev          # Dev server with HMR at http://localhost:5173
npm run build        # Type-check (tsc -b) then Vite production build → dist/
npm run preview      # Serve the production build locally
npm run lint         # ESLint on all source files
```

Vitest and Playwright are configured and wired to npm scripts:

```bash
npm test           # Vitest in watch mode
npm run test:ui    # Vitest with web UI (port 51204)
npm run test:e2e   # Playwright E2E — playwright.config.ts starts `npm run dev` itself (reuses one already running)
npx vitest run     # Single run (CI)
```

Config file: `vitest.config.ts` — uses `@vitejs/plugin-react`, `jsdom` environment, globals enabled, `@` alias mapped to `/src`.

`src/__tests__/setup.ts` (wired via `vitest.config.ts`'s `setupFiles`) mocks `HTMLMediaElement.prototype.play/pause/load` (jsdom throws "not implemented" otherwise) and stubs a minimal `AudioContext` (jsdom has no Web Audio at all).

Tests live under `src/__tests__/`:
- `example.test.ts` — baseline sanity check (`1 + 1 === 2`)
- `playerStore.test.ts` — shuffle keeps the current track, `nextTrack`/`prevTrack` across all three repeat modes (including single-track queues), `appendToQueue` dedup, `playIndex` restart-on-same-track, `partialize` only persisting preferences
- `eqStore.test.ts` — presets, `setGain` switching the preset to "Custom", `effectiveGains` under bypass, `togglePanel` and that `panelOpen` is excluded from persistence
- `radioAttempts.test.ts` — `buildStreamAttempts` (proxy/no-proxy, HLS with/without native support, empty `url_resolved`, no duplicate candidate URLs)
- `playbackCoordinator.test.ts` — `claimPlayback` stopping every other source and updating `active`
- `formatters.test.ts` — `formatTime` edge cases (0, `NaN`, `Infinity`, minute rollover) and `flagEmoji`
- `localEngine.test.ts` — `ended` advances the queue, a `pause` while `el.ended` is true doesn't clear `isPlaying`, `previous()`'s 3-second restart-vs-skip threshold

E2E (Playwright, `playwright.config.ts` + `e2e/smoke.spec.ts`): the 4 routes load without console errors, switching theme updates `data-theme`, and `/station/<unknown-uuid>` doesn't crash the radio page.

**Dependency note**: `vite-plugin-pwa@2.0.0`'s peer range covers Vite 8 (`^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`), so `npm install` works with no flags and no `.npmrc` override — the `legacy-peer-deps=true` `.npmrc` that was needed for `vite-plugin-pwa@1.2.0` has been removed. `sharp` was used once (as a temporary devDependency) to regenerate the PWA PNG icons from their SVG sources and was then uninstalled — reinstall it (`npm i -D sharp`) only if you need to run `scripts/generate-icons.mjs` again after changing an icon source. Same pattern applies to `scripts/screenshots.mjs` (regenerates `docs/screenshots/*.png`): reinstall `sharp` first, run `npm run screenshots`, then uninstall it again.

## Architecture

### Module layout

```
src/
  app/              # Root component, Router, providers (AudioProvider, ThemeProvider, NotificationProvider)
  modules/          # Feature modules, each self-contained:
    player/         #   local file playback
      services/     #     localEngine.ts — the actual <audio> element + playback logic
      store/        #     playerStore.ts — queue, playback state, preferences
    radio/          #   internet radio streaming
      services/     #     radioPlayer.ts, radioBrowserApi.ts
      store/        #     radioStore.ts
    favorites/      #   IndexedDB persistence (Dexie)
    recorder/       #   MediaRecorder audio capture
      services/     #     recorderService.ts — the actual MediaRecorder + level meter
  pages/            # Thin route wrappers (lazy-loaded) — import module components
  shared/           # Cross-module: UI primitives, layout shell, hooks, utils
    audio/          #   audioGraph.ts, playbackCoordinator.ts, eqStore.ts — shared by every audio source
  styles/           # globals.css — CSS variables, Tailwind @import, theme variants
  types/            # Ambient .d.ts augmenting lib.dom.d.ts (File System Access API gaps)
```

Services vs. hooks: a module's `services/*.ts` file owns the actual browser API object (an `<audio>` element, a `MediaRecorder`, Howler used to live here) as a **module-scope singleton**, not a React ref. That singleton survives component unmount/remount — e.g. navigating away from `/recorder` mid-recording and back no longer loses the `MediaRecorder` reference. React components only call the service's exported functions and read the paired Zustand store; they never hold the browser object themselves.

### State management

Each module has its own **Zustand store** (`modules/*/store/*.ts`), plus two cross-module stores that live in `shared/audio/` because they're not owned by any single module:

- `playerStore` — queue, shuffledQueue, currentIndex, playback state, volume, mute, repeat (`none`/`queue`/`track`), crossfade. Persists volume/mute/repeat/crossfade (not the queue — `File` objects can't survive a reload).
- `radioStore` — station list, current station, `status` (`idle`/`connecting`/`playing`/`paused`/`error`), `routed` (whether the active stream made it through the Web Audio graph), search filters.
- `favoritesStore` — wraps Dexie async calls (favorites, collections, history, saved directory handle); call `.load()` on mount to hydrate. Only this store touches `db` directly.
- `recorderStore` — recorder `status` (`idle`/`recording`/`paused`/`processing`), elapsed time, audio level, session recordings list.
- `eqStore` (`shared/audio/eqStore.ts`) — EQ enabled/gains/preset (persisted) plus `panelOpen` for the global EQ panel (UI-only, excluded from persistence via `partialize`).
- `playbackCoordinator` (`shared/audio/playbackCoordinator.ts`) — not really "state" so much as a traffic light: `registerPlaybackSource(name, stop)` lets `localEngine`/`radioPlayer` register how to stop themselves, and `claimPlayback(name)` stops every other registered source so local and radio audio are never audible at the same time. `usePlaybackStore` exposes `active: 'local' | 'radio' | null` for UI that needs to know which source is currently in charge (MiniPlayer, Media Session, keyboard shortcuts).

### Audio pipeline

`shared/audio/audioGraph.ts` creates the Web Audio graph as a **module-level singleton** the first time `getAudioGraph()` is called — not inside a React effect, so it is created at most once and survives StrictMode's double mount:

```
source(s) → masterGain → eq[0..9] (BiquadFilterNode, peaking) → analyserNode → destination
```

`routeThroughGraph(el)` connects a `<audio>` element into that chain (guarded by a `WeakMap` so `createMediaElementSource()`, which throws on a second call for the same element, is never called twice). `AudioProvider` just reads the singleton once and exposes it through React context for components that need the nodes directly (`Visualizer`, `Equalizer`'s spectrum, `Recorder`'s "Esta app" source) — it owns nothing and closes nothing.

Two independent playback services route audio into that graph:

- **`modules/player/services/localEngine.ts`** — one lazily-created `<audio>` element for local files. `useAudioEngine()` (mounted once, in `AppInner`) bridges `playerStore` → `localEngine` via `store.subscribe`, never via `usePlayerStore()`, so the 5-times-a-second `currentTime` updates never re-render the app. Handles crossfade (by `setInterval`, since `<audio>` has no native fade), the file/cover object-URL registries (`registerFile`/`registerCover`, revoked by `releaseFiles` when a track leaves every queue), and history logging on first `play` per track.
- **`modules/radio/services/radioPlayer.ts`** — two `<audio>` elements, `corsEl` (`crossOrigin="anonymous"`, routed into the graph the first time it successfully plays) and `plainEl` (never routed — a cross-origin element without CORS taints the graph into silence if routed). `buildStreamAttempts(station, proxyUrl)` is a pure function producing the ordered list of `{url, el, hls}` attempts (CORS proxy variant before direct, HLS only via `cors` unless the browser has native HLS support). HLS streams use `hls.js`, imported dynamically (`await import('hls.js')`) so it only loads into a bundle chunk when an HLS station is actually played. Auto-reconnects (3 attempts, 1/2/4s backoff) on `error`/`ended`/a 10s `stalled`. An autoplay rejection (`NotAllowedError`) is distinguished from a real connection failure and surfaces as an info toast ("Pulsa ▶ para escuchar la emisora"), not an error.

Both services call `registerPlaybackSource('local'|'radio', stopFn)` and `claimPlayback(...)` from `playbackCoordinator`, which is what makes "switching to the other source always stops the first one" a property of the coordinator rather than something every call site has to remember.

**Howler.js has been fully removed** — both playback paths use the native `<audio>` element directly, which is what makes per-element CORS routing (and therefore a working visualizer/EQ for CORS-enabled radio stations) possible in the first place.

### Equalizer

`shared/audio/eqStore.ts` holds the 10-band gains/preset/enabled flag (persisted) and `panelOpen` (not persisted). `useAudioEngine()` subscribes to the store and calls `setEqGains()` on the shared graph on every change — components never touch the `BiquadFilterNode`s directly, they only call the store's actions. The panel (`shared/components/audio/EqualizerPanel.tsx`) is mounted once in `AppInner`, anchored above `MiniPlayer`, and opens from the MiniPlayer's 🎚️ button, the toolbar button in `LocalPlayer`/`RadioPage`, or the `E` keyboard shortcut — all of which just call `togglePanel()`. It warns (without disabling the sliders) when the active source is a radio station that isn't routed through the graph.

### Persistence

`src/modules/favorites/db/favoritesDb.ts` exports a singleton `db` (Dexie instance). `version(1)` has `favorites`, `collections`, `history`, `tracks`; `version(2)` adds `handles` (`{key, handle: FileSystemDirectoryHandle}`, used by "Reabrir última carpeta" in `useLocalFiles`). Schema migrations go in the `version(N).stores({})` calls. `favoritesStore` is the only code that should call `db` directly.

### Theming

Three themes: `dark` (default), `light`, `neon`. Switching sets `data-theme` on `<html>` and persists to `localStorage`. All colours are CSS variables defined in `globals.css` under `:root`, `[data-theme="light"]`, and `[data-theme="neon"]`. Tailwind classes can reference these via arbitrary values like `bg-[var(--bg-surface)]`.

### Radio streaming

See "Audio pipeline" above for `radioPlayer.ts`'s connection/reconnection logic. `RadioPage.tsx` is the only place that calls `playStation`/`toggleRadio`/`stopRadio` from UI; clicking a station card only plays it, the ⓘ button opens the detail modal. The deep link route `/station/:uuid` falls back to `radioBrowserApi.byUuid()` when the station isn't in the already-loaded top-100 list.

### Keyboard shortcuts & Media Session

`useKeyboardShortcuts()` registers a single `keydown` listener with `[]` deps — every key handler reads fresh state via `getState()`/`getActiveSource()` rather than through a reactive selector, so it never re-renders the app. Space/←→/Shift+←→ act on whichever source `playbackCoordinator` says is active; `E` toggles the EQ panel; `?` opens the shortcuts help modal (rendered in `AppInner`). `useMediaSession()` mirrors the same "active source wins" rule for the system media controls, and syncs `setPositionState` via a plain store subscription (not a selector) to avoid re-rendering on every `timeupdate`.

### Environment variables

Defined in `.env.example`. All are optional — the app works without them:

| Variable | Purpose |
|---|---|
| `VITE_CORS_PROXY_URL` | Cloudflare Worker proxy for CORS-blocked streams (see `proxy/cloudflare-worker.js`) — empty by default; `radioPlayer` tries the direct URL regardless |
| `VITE_APP_URL` | Base URL for share links / Open Graph tags — empty by default, falls back to `window.location.origin` |

### PWA / Service Worker

`vite-plugin-pwa` generates `dist/sw.js` via Workbox (`generateSW` mode). Manifest icons are real PNGs generated from `public/icons/icon.svg` (and a padded `icon-maskable.svg` for the `purpose: 'maskable'` entry) via `scripts/generate-icons.mjs` — rerun it with `sharp` reinstalled if the source SVG changes. Radio API responses are cached `NetworkFirst` (5 min TTL). Station favicons (cross-origin, frequently opaque responses) get a dedicated `CacheFirst` rule with `cacheableResponse: {statuses: [0, 200]}` and a 30-day expiration, checked before the generic same-origin image cache rule. Audio streams are intentionally **not** cached. To update caching rules, edit the `workbox.runtimeCaching` array in `config/plugins/pwa.ts`.

### Path alias

`@` resolves to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### TypeScript strictness

`noUnusedLocals` and `noUnusedParameters` are disabled to allow incremental development. `erasableSyntaxOnly` is enabled, so `enum` and `namespace` are not allowed — use `const` objects or union types instead. `src/types/fs-access.d.ts` fills in File System Access API members TypeScript's `lib.dom.d.ts` doesn't yet ship (`FileSystemDirectoryHandle.values()`, `FileSystemHandle.requestPermission()`, `Window.showDirectoryPicker()`/`showSaveFilePicker()`).
