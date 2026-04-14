# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run test:e2e   # Playwright E2E (requires npm run dev running)
npx vitest run     # Single run (CI)
```

Config file: `vitest.config.ts` — uses `@vitejs/plugin-react`, `jsdom` environment, globals enabled, `@` alias mapped to `/src`.

Tests live under `src/__tests__/`. Currently:
- `src/__tests__/example.test.ts` — baseline sanity check (`1 + 1 === 2`)

**Dependency note**: `vite-plugin-pwa@1.2.0` does not declare Vite 8 in its peer range. A `.npmrc` with `legacy-peer-deps=true` is checked in to prevent install failures. `jsdom` must be installed manually with `--legacy-peer-deps` on fresh checkouts.

## Architecture

### Module layout

```
src/
  app/              # Root component, Router, providers (AudioProvider, ThemeProvider, NotificationProvider)
  modules/          # Feature modules, each self-contained:
    player/         #   local file playback
    radio/          #   internet radio streaming
    favorites/      #   IndexedDB persistence (Dexie)
    recorder/       #   MediaRecorder audio capture
  pages/            # Thin route wrappers (lazy-loaded) — import module components
  shared/           # Cross-module: UI primitives, layout shell, hooks, utils
  styles/           # globals.css — CSS variables, Tailwind @import, theme variants
```

### State management

Each module has its own **Zustand store** (`modules/*/store/*.ts`). There is no shared global store — cross-module reads happen by importing individual stores directly. The stores are:

- `playerStore` — queue, currentIndex, playback state, volume, shuffle, repeat, crossfade
- `radioStore` — station list, current station, streaming status, search filters
- `favoritesStore` — wraps Dexie async calls; call `.load()` on mount to hydrate
- `recorderStore` — recorder status, elapsed time, audio level, session recordings list

### Audio pipeline

`AudioProvider` (mounted once at the root) owns the single `AudioContext` and builds a fixed node graph on mount:

```
masterGainNode → eq[0..9] (BiquadFilterNode, peaking) → analyserNode → destination
```

Access anywhere via `useAudioContext()`. The `analyserNode` is what all visualisers read from — connect new audio sources to `masterGainNode`, not directly to `destination`.

Howler.js is used for actual file/stream playback (`html5: true` for streaming). The module-level `let radioHowl` in `RadioPage.tsx` holds the active radio `Howl` instance; it must be `.unload()`-ed before creating a new one.

### Persistence

`src/modules/favorites/db/favoritesDb.ts` exports a singleton `db` (Dexie instance) with four tables: `favorites`, `collections`, `history`, `tracks`. Schema migrations go in the `version(N).stores({})` call. `favoritesStore` is the only code that should call `db` directly.

### Theming

Three themes: `dark` (default), `light`, `neon`. Switching sets `data-theme` on `<html>` and persists to `localStorage`. All colours are CSS variables defined in `globals.css` under `:root`, `[data-theme="light"]`, and `[data-theme="neon"]`. Tailwind classes can reference these via arbitrary values like `bg-[var(--bg-surface)]`.

### Radio streaming

`RadioPage.tsx` uses Howler for HTTP streams and is the only place that instantiates a radio `Howl`. On stream error it retries up to 3 times with exponential backoff, switching to the CORS proxy URL (`VITE_CORS_PROXY_URL`) on retries. Stream availability is checked with a HEAD request (3 s timeout) before playback begins.

### Environment variables

Defined in `.env.example`. All are optional — the app works without them:

| Variable | Purpose |
|---|---|
| `VITE_LASTFM_API_KEY` | Album art fallback from Last.fm |
| `VITE_CORS_PROXY_URL` | Cloudflare Worker proxy for CORS-blocked streams |
| `VITE_APP_URL` | Base URL for share links / Open Graph tags |

### PWA / Service Worker

`vite-plugin-pwa` generates `dist/sw.js` via Workbox (`generateSW` mode). Radio API responses are cached with `NetworkFirst` (5 min TTL). Audio streams are intentionally **not** cached. To update caching rules, edit the `workbox.runtimeCaching` array in `vite.config.ts`.

### Path alias

`@` resolves to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

### TypeScript strictness

`noUnusedLocals` and `noUnusedParameters` are disabled to allow incremental development. `erasableSyntaxOnly` is enabled, so `enum` and `namespace` are not allowed — use `const` objects or union types instead.
