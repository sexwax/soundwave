# SoundWave — Prompt para Claude Code

> Copia todo el contenido de este archivo y pégalo en Claude Code al iniciar una sesión nueva en el directorio raíz del proyecto.

---

## CONTEXTO DEL PROYECTO

Construye **SoundWave**, una aplicación web de música profesional, completamente operativa, como Progressive Web App (PWA). La app debe funcionar en el navegador sin instalación de software adicional, usando APIs nativas del navegador y servicios externos gratuitos.

---

## STACK TECNOLÓGICO OBLIGATORIO

- **Framework:** React 19 + TypeScript + Vite 6
- **Estado global:** Zustand
- **Estilos:** TailwindCSS 4 + CSS Variables para theming
- **Animaciones:** Framer Motion
- **Audio:** Web Audio API nativa + Howler.js
- **Grabación:** MediaRecorder API + lamejs (encoding MP3 en cliente)
- **Almacenamiento:** IndexedDB via Dexie.js
- **Ficheros locales:** File System Access API
- **Radio API:** Radio Browser API — `https://de1.api.radio-browser.info`
- **Metadatos:** Last.fm API (free tier) + music-metadata-browser
- **Routing:** React Router v7
- **Testing:** Vitest + Playwright
- **PWA:** vite-plugin-pwa + Workbox
- **Linting:** ESLint + Prettier

---

## ESTRUCTURA DE DIRECTORIOS

Crea exactamente esta estructura desde el principio:

```
soundwave/
├── public/
│   ├── icons/          # PWA icons (512x512, 192x192, etc.)
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── providers/
│   │       ├── AudioProvider.tsx      # Context del motor de audio
│   │       ├── ThemeProvider.tsx
│   │       └── NotificationProvider.tsx
│   ├── modules/
│   │   ├── player/                    # Módulo reproductor local
│   │   │   ├── components/
│   │   │   │   ├── LocalPlayer.tsx
│   │   │   │   ├── TrackList.tsx
│   │   │   │   ├── FileExplorer.tsx
│   │   │   │   └── Equalizer.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLocalFiles.ts
│   │   │   │   ├── useAudioEngine.ts
│   │   │   │   └── useMetadata.ts
│   │   │   └── store/
│   │   │       └── playerStore.ts
│   │   ├── radio/                     # Módulo emisoras
│   │   │   ├── components/
│   │   │   │   ├── RadioSearch.tsx
│   │   │   │   ├── StationCard.tsx
│   │   │   │   ├── StationDetail.tsx
│   │   │   │   ├── StationFilters.tsx
│   │   │   │   └── StationList.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useRadioBrowser.ts
│   │   │   │   └── useStreamCheck.ts
│   │   │   ├── services/
│   │   │   │   └── radioBrowserApi.ts
│   │   │   └── store/
│   │   │       └── radioStore.ts
│   │   ├── favorites/                 # Módulo favoritos
│   │   │   ├── components/
│   │   │   │   ├── FavoritesList.tsx
│   │   │   │   ├── CollectionManager.tsx
│   │   │   │   └── HistoryList.tsx
│   │   │   ├── db/
│   │   │   │   └── favoritesDb.ts    # Dexie schema
│   │   │   └── store/
│   │   │       └── favoritesStore.ts
│   │   ├── recorder/                  # Módulo grabación
│   │   │   ├── components/
│   │   │   │   ├── Recorder.tsx
│   │   │   │   ├── VUMeter.tsx
│   │   │   │   ├── WaveformMonitor.tsx
│   │   │   │   └── RecordingsList.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useRecorder.ts
│   │   │   └── store/
│   │   │       └── recorderStore.ts
│   │   └── social/                    # Módulo compartición
│   │       ├── components/
│   │       │   ├── SharePanel.tsx
│   │       │   ├── EmbedGenerator.tsx
│   │       │   └── QRGenerator.tsx
│   │       └── hooks/
│   │           └── useShare.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── MiniPlayer.tsx     # Flotante persistente
│   │   │   │   └── TopBar.tsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Slider.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   └── Spinner.tsx
│   │   │   └── audio/
│   │   │       ├── Visualizer.tsx     # FFT canvas (barras/onda/circular)
│   │   │       └── WaveformBar.tsx
│   │   ├── hooks/
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useMediaSession.ts    # MediaSession API
│   │   └── utils/
│   │       ├── audioUtils.ts
│   │       ├── formatters.ts
│   │       └── corsProxy.ts
│   └── styles/
│       ├── globals.css
│       └── themes.css                # Variables CSS por tema
├── e2e/
│   └── playwright/
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## MÓDULO 1 — REPRODUCTOR LOCAL

### Funcionalidad requerida:

**Acceso a ficheros:**
- Usar `window.showDirectoryPicker()` (File System Access API) para solicitar acceso a carpetas
- Detectar soporte del navegador; si no está disponible, usar `<input type="file" webkitdirectory multiple>` como fallback
- Indexar recursivamente los ficheros de audio encontrados
- Formatos soportados: `.mp3`, `.flac`, `.wav`, `.ogg`, `.opus`, `.aac`, `.m4a`

**Metadatos:**
- Usar `music-metadata-browser` para leer tags ID3/FLAC/Vorbis de cada fichero
- Extraer: título, artista, álbum, año, número de track, género, duración, portada embebida (como Blob URL)
- Si no hay portada en el fichero, buscar en Last.fm API por `artist + album`
- Cachear metadatos en IndexedDB para no releerlos en cada sesión

**Motor de audio:**
- Usar Howler.js como capa de abstracción sobre Web Audio API
- Exponer un `AudioContext` compartido accesible por todos los módulos (necesario para el grabador)
- Implementar: play, pause, stop, seek, volumen (0-1), balance estéreo
- Crossfade configurable: cuando una pista termina, hacer fade-out/fade-in entre 0 y 12 segundos
- Modo shuffle: Fisher-Yates sobre la cola actual
- Repeat: ninguno / track / cola completa

**Ecualizador:**
- 10 bandas de frecuencia: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
- Implementar como cadena de nodos `BiquadFilterNode` en el AudioContext
- Preconfiguraciones: Flat, Bass Boost, Treble Boost, Rock, Jazz, Pop, Classical

**Visualizador FFT:**
- Nodo `AnalyserNode` conectado al AudioContext
- Canvas `requestAnimationFrame` a 60fps
- Tres modos seleccionables: barras verticales, onda de onda (waveform), circular
- Colores que respondan al tema activo usando CSS variables

**Atajos de teclado** (registrar globalmente con `useKeyboardShortcuts`):
- `Espacio` → play/pause
- `←` / `→` → anterior/siguiente track
- `M` → mute/unmute
- `F` → añadir/quitar favorito de la pista actual
- `R` → iniciar/detener grabación
- `Shift+←` / `Shift+→` → seek -10s / +10s

---

## MÓDULO 2 — STREAMING DE EMISORAS DE RADIO

### Integración con Radio Browser API:

Base URL: `https://de1.api.radio-browser.info/json`

Implementar en `radioBrowserApi.ts` las siguientes llamadas:

```typescript
// Buscar emisoras
GET /stations/search?name=&country=&language=&tags=&bitrateMin=&codec=&hidebroken=true&order=votes&reverse=true&offset=0&limit=50

// Emisoras más populares
GET /stations/topvote/100

// Países disponibles
GET /countries

// Géneros/tags disponibles
GET /tags?order=stationcount&reverse=true&limit=100

// Registrar click (estadísticas)
GET /url/{stationuuid}

// Votar emisora
GET /vote/{stationuuid}
```

**Filtros de búsqueda disponibles en UI:**
- Texto libre (nombre de emisora)
- País (selector con lista completa)
- Idioma
- Género/tag (multiselect)
- Bitrate mínimo: slider 0 - 320 kbps
- Codec: MP3, AAC, OGG, HLS, cualquiera
- Solo emisoras activas (hidebroken: true por defecto)
- Ordenación: votos, popularidad, nombre, bitrate

**Validación de stream antes de reproducir:**
- Hacer un fetch HEAD a la URL del stream con timeout de 3 segundos
- Si falla, marcar la emisora como `status: 'offline'` y mostrar aviso
- No usar el proxy CORS para la validación, solo para la reproducción si es necesario

**Reproducción de streams:**
- Usar Howler.js con `format: ['mp3', 'aac', 'ogg']` para streams HTTP
- Para streams HLS (`.m3u8`), integrar `hls.js`
- Conectar el stream al mismo `AudioContext` compartido para que el grabador pueda capturarlo
- Manejar reconexión automática si el stream se interrumpe (3 reintentos con backoff exponencial)

**Proxy CORS** (para streams que bloquean CORS):
- Crear un Cloudflare Worker simple: `https://proxy.soundwave.workers.dev?url=ENCODED_URL`
- Implementarlo como fichero `worker.js` en `/workers/cors-proxy/`
- El proxy simplemente hace fetch de la URL y retransmite la respuesta con headers CORS permisivos

**Ficha de emisora** (modal/panel lateral):
- Logo de la emisora
- Nombre, país (con bandera emoji), idioma, tags
- Bitrate y codec
- Botón de voto (incrementar votos en Radio Browser)
- Botón añadir/quitar favorito
- Estado de conexión en tiempo real
- Botón de compartir (abre el panel social)

---

## MÓDULO 3 — FAVORITOS Y PERSISTENCIA

### Schema de Dexie.js:

```typescript
// favoritesDb.ts
import Dexie, { Table } from 'dexie';

interface FavoriteStation {
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

interface Collection {
  id?: number;
  name: string;
  color: string; // hex
  createdAt: Date;
}

interface PlayHistory {
  id?: number;
  type: 'local' | 'radio';
  title: string;
  artist?: string;
  stationuuid?: string;
  filePath?: string;
  playedAt: Date;
  durationMs?: number;
}

interface LocalTrack {
  id?: number;
  filePath: string;      // clave única
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  coverUrl?: string;     // blob URL en memoria; URL de Last.fm o null
  lastModified: number;  // para invalidar caché
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
```

**Funcionalidades de favoritos:**
- Añadir/quitar emisora de favoritos con animación de corazón
- Crear colecciones con nombre y color personalizado
- Mover emisoras entre colecciones (drag & drop)
- Exportar favoritos: botón descarga como `.json` y como `.m3u`
- Importar: parsear `.m3u` o `.json` y añadir a favoritos
- Historial: últimas 500 reproducciones, paginadas, buscables
- Al iniciar la app: restaurar última emisora escuchada y estado (volumen, posición)

---

## MÓDULO 4 — GRABACIÓN DE AUDIO

### Implementación técnica crítica:

**Grabación del audio de SoundWave (fuente interna):**

```typescript
// useRecorder.ts — esquema de implementación
const audioContext = getSharedAudioContext(); // del AudioProvider
const destination = audioContext.createMediaStreamDestination();

// Conectar el nodo de salida principal del player al destination
masterGainNode.connect(destination);

// Crear MediaRecorder sobre ese stream
const mediaRecorder = new MediaRecorder(destination.stream, {
  mimeType: getSupportedMimeType(), // 'audio/webm;codecs=opus' o 'audio/ogg;codecs=opus'
  audioBitsPerSecond: 192000,
});
```

**Grabación de audio del sistema (fuente externa — otras apps/webs):**

```typescript
// Requiere Chrome/Edge — captura el audio del sistema completo
const displayStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,   // requerido por la API aunque no se use
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    sampleRate: 44100,
  },
});

// Extraer solo la pista de audio
const audioTrack = displayStream.getAudioTracks()[0];
const audioOnlyStream = new MediaStream([audioTrack]);

// Detener la pista de video para no capturar pantalla innecesariamente
displayStream.getVideoTracks()[0].stop();
```

**Flujo completo de grabación:**
1. Usuario selecciona fuente: "Esta app" | "Sistema completo (otras apps)"
2. Si "Sistema completo": llamar `getDisplayMedia`, mostrar instrucciones de qué seleccionar
3. Iniciar `MediaRecorder` → acumular chunks en array
4. Mostrar VU Meter en tiempo real: nodo `AnalyserNode` sobre el stream grabado
5. Al detener: concatenar chunks en `Blob`
6. Si formato MP3 solicitado: usar `lamejs` para recodificar el blob WebM/OGG a MP3
7. Guardar usando File System Access API:
   ```typescript
   const fileHandle = await window.showSaveFilePicker({
     suggestedName: `${stationName}-${formatDate(new Date())}.mp3`,
     types: [{ description: 'Audio', accept: { 'audio/mpeg': ['.mp3'] } }],
     startIn: savedDirectoryHandle ?? 'music', // recordar carpeta elegida
   });
   const writable = await fileHandle.createWritable();
   await writable.write(audioBlob);
   await writable.close();
   ```

**UI del grabador:**
- Botón REC con animación de pulso rojo cuando está activo
- Tiempo transcurrido en formato MM:SS
- VU Meter: barras animadas que responden al nivel de audio en tiempo real
- Waveform en canvas del audio que se está grabando
- Indicador del tamaño estimado del fichero
- Botón de pausa durante grabación
- Lista de grabaciones de la sesión actual con opción de reproducir o guardar de nuevo

---

## MÓDULO 5 — COMPARTICIÓN SOCIAL

### Funcionalidades:

**URL de compartición:**
- Formato: `https://soundwave.app/station/{stationuuid}`
- Al abrir esa URL, la app carga y conecta automáticamente a esa emisora
- Implementar en el Router: si la ruta contiene `/station/:uuid`, buscar en Radio Browser y reproducir

**Open Graph meta tags dinámicos:**
```html
<!-- Actualizar dinámicamente con react-helmet-async -->
<meta property="og:title" content="🎵 Escuchando: {stationName} en SoundWave" />
<meta property="og:description" content="{tags} • {country} • {bitrate}kbps" />
<meta property="og:image" content="{stationFavicon}" />
<meta property="og:url" content="https://soundwave.app/station/{uuid}" />
<meta name="twitter:card" content="summary_large_image" />
```

**Web Share API + botones fallback:**
```typescript
const shareData = {
  title: `Escuchando ${station.name}`,
  text: `Te comparto esta emisora: ${station.name}`,
  url: `https://soundwave.app/station/${station.stationuuid}`,
};

if (navigator.share) {
  await navigator.share(shareData); // nativo en móvil
} else {
  // mostrar panel con botones individuales
}
```

**Botones individuales de redes sociales:**
- Twitter/X: `https://twitter.com/intent/tweet?text=ENCODED&url=ENCODED`
- WhatsApp: `https://wa.me/?text=ENCODED`
- Telegram: `https://t.me/share/url?url=ENCODED&text=ENCODED`
- Facebook: `https://www.facebook.com/sharer/sharer.php?u=ENCODED`
- LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=ENCODED`
- Copiar al portapapeles: `navigator.clipboard.writeText(url)`

**Widget embebible:**
```html
<!-- Código HTML generado para copiar/pegar en blogs -->
<iframe 
  src="https://soundwave.app/embed/{stationuuid}"
  width="400" height="100"
  frameborder="0"
  allow="autoplay; clipboard-write"
></iframe>
```
- Ruta `/embed/:uuid`: mini-player compacto sin sidebar, tema oscuro, con botón play

**QR Code:**
- Usar librería `qrcode` (npm) para generar QR del link
- Exportable como PNG via `canvas.toDataURL()`

---

## DISEÑO Y UI — REQUISITOS VISUALES

### Tema principal (Dark Professional):

```css
/* globals.css */
:root {
  --bg-base: #080b12;
  --bg-surface: #0f1521;
  --bg-elevated: #161d2e;
  --border-subtle: #1e2a3f;
  --border-default: #2e3f5e;

  --accent-primary: #00e5ff;      /* cyan — acciones principales */
  --accent-secondary: #7c3aed;    /* violeta — highlights */
  --accent-warning: #f59e0b;      /* ámbar — grabación activa */
  --accent-success: #22c55e;      /* verde — online/activo */
  --accent-danger: #ef4444;       /* rojo — error/offline */

  --text-primary: #e2eaf5;
  --text-secondary: #6b7fa3;
  --text-disabled: #3d4f6e;

  --player-height: 80px;
  --sidebar-width: 240px;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
}
```

**Tipografía:**
- Display/headings: `Syne` (Google Fonts) — peso 700-800
- Body/labels: `DM Mono` — monoespaciado para números, tiempos, tags
- Texto largo: `Lora` — serif para descripciones

**Layout principal:**
```
┌──────────────────────────────────────────────┐
│  TopBar (búsqueda global + controles usuario) │
├─────────┬────────────────────────────────────┤
│         │                                    │
│ Sidebar │   Contenido principal (Router)     │
│ 240px   │                                    │
│         │                                    │
├─────────┴────────────────────────────────────┤
│       MiniPlayer (80px) — siempre visible    │
└──────────────────────────────────────────────┘
```

**MiniPlayer** (siempre visible en la parte inferior):
- Portada del track / logo de emisora (40x40px)
- Título y artista/emisora con scroll marquee si el texto es largo
- Controles: anterior, play/pause, siguiente
- Barra de progreso (solo en modo local — el streaming no tiene progreso)
- Volumen con slider
- Botón de favorito (corazón)
- Botón de grabación (punto rojo) — inicia grabación con un click
- Visualizador FFT compacto en la barra del MiniPlayer
- Botón expandir al visualizador full-screen

**Temas adicionales (al menos 2 más además del dark principal):**
- Light mode: fondo blanco roto, accent azul marino
- Neon: fondo negro total, accent verde neón `#00ff88`

---

## ACCESIBILIDAD Y RENDIMIENTO

- Todos los controles interactivos con `aria-label` apropiado
- Navegación completa por teclado (foco visible con `focus-visible`)
- `prefers-reduced-motion`: desactivar animaciones si el usuario lo tiene configurado
- Virtualización de listas largas (más de 100 ítems) con `@tanstack/react-virtual`
- Indexado de biblioteca local en un `Web Worker` para no bloquear la UI
- Lazy loading de módulos por ruta con `React.lazy` + `Suspense`
- Service Worker (vite-plugin-pwa) para:
  - Cache de la shell de la app (offline-first)
  - Cache de logos de emisoras
  - NO cachear los streams de audio (siempre en tiempo real)
- `IntersectionObserver` para lazy load de logos en listas largas de emisoras

---

## NOTIFICACIONES DEL SISTEMA

```typescript
// useNotifications.ts
// Solicitar permiso al primer play
await Notification.requestPermission();

// Mostrar notificación cuando cambia el track
new Notification(`🎵 ${track.title}`, {
  body: `${track.artist} — ${track.album}`,
  icon: track.coverUrl ?? '/icons/default-cover.png',
  silent: true,
  tag: 'now-playing', // reemplaza la notificación anterior
});
```

**MediaSession API** — controles en la barra de notificaciones del OS:
```typescript
navigator.mediaSession.metadata = new MediaMetadata({
  title: currentTrack.title,
  artist: currentTrack.artist,
  album: currentTrack.album,
  artwork: [{ src: currentTrack.coverUrl, sizes: '512x512' }],
});

navigator.mediaSession.setActionHandler('play', () => audioEngine.play());
navigator.mediaSession.setActionHandler('pause', () => audioEngine.pause());
navigator.mediaSession.setActionHandler('previoustrack', () => audioEngine.prev());
navigator.mediaSession.setActionHandler('nexttrack', () => audioEngine.next());
```

---

## MANEJO DE ERRORES — CASOS CRÍTICOS

Implementar mensajes claros para el usuario en estos casos:

| Situación | Mensaje al usuario | Acción |
|---|---|---|
| Navegador no soporta File System Access API | "Tu navegador no soporta acceso a carpetas. Usa Chrome o Edge para esta función." | Mostrar botón de carga por archivo |
| Stream de emisora offline | "Esta emisora no está disponible ahora mismo." | Botón "Intentar de nuevo" |
| Error CORS en stream | "Conectando con proxy seguro..." | Reintentar con proxy automáticamente |
| `getDisplayMedia` rechazado | "Para grabar audio del sistema necesitas compartir una pestaña o ventana con audio." | Guía paso a paso |
| IndexedDB no disponible | "El almacenamiento local no está disponible. Los favoritos no se guardarán." | Degradar a memoria |
| Sin conexión a internet | "Sin conexión. La música local sigue disponible." | Banner de estado |

---

## COMANDOS DE DESARROLLO

```bash
# Instalar dependencias
npm install

# Desarrollo con HMR
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Tests unitarios
npm run test

# Tests E2E (requiere `npm run dev` corriendo)
npm run test:e2e

# Linting
npm run lint

# Type checking
npm run typecheck
```

---

## PACKAGE.JSON — DEPENDENCIAS PRINCIPALES

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "howler": "^2.2.4",
    "hls.js": "^1.5.0",
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.7",
    "music-metadata-browser": "^2.5.0",
    "lamejs": "^1.2.1",
    "framer-motion": "^11.0.0",
    "qrcode": "^1.5.3",
    "@tanstack/react-virtual": "^3.0.0",
    "react-helmet-async": "^2.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.45.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## ORDEN DE IMPLEMENTACIÓN

Implementa los módulos exactamente en este orden para tener una app funcional lo antes posible:

1. **Setup base** — Vite + React + TS + Tailwind + Router + Zustand + layout principal
2. **AudioProvider** — AudioContext compartido, nodos de ganancia, conexiones
3. **Reproductor local** — File System Access + metadata + Howler.js + controles básicos
4. **MiniPlayer** — visible en todas las rutas, con controles y estado del player
5. **Visualizador FFT** — canvas en MiniPlayer y versión expandida
6. **Radio Browser API** — búsqueda, lista, filtros, reproducción de streams
7. **Sistema de favoritos** — IndexedDB + Dexie + colecciones + historial
8. **Módulo de grabación** — MediaRecorder + VU meter + guardado en disco
9. **Compartición social** — URLs, Open Graph, botones sociales, QR, embed
10. **PWA** — manifest, service worker, instalación
11. **Temas y pulido visual** — temas light/neon, animaciones, responsive
12. **Tests E2E** — Playwright para flujos críticos

---

## ENTORNO Y CLAVES API

Crear fichero `.env.example` con:

```env
# Last.fm API (gratuita — obtener en https://www.last.fm/api/account/create)
VITE_LASTFM_API_KEY=your_lastfm_api_key_here

# Radio Browser API — no requiere key, es pública
# Base URL: https://de1.api.radio-browser.info

# URL del proxy CORS (Cloudflare Worker — opcional)
VITE_CORS_PROXY_URL=https://proxy.soundwave.workers.dev

# URL base de la app (para Open Graph y links de compartición)
VITE_APP_URL=https://soundwave.app
```

---

## NOTAS IMPORTANTES

- **Compatibilidad:** Optimizar para Chrome 120+ y Edge 120+. Firefox y Safari tienen soporte parcial de File System Access API — documentar limitaciones en la UI.
- **Sin backend requerido:** Toda la funcionalidad core debe funcionar sin servidor. El backend es opcional solo para sincronización de favoritos entre dispositivos.
- **Privacidad:** Los ficheros locales nunca se suben a ningún servidor. Mencionar esto en la UI.
- **Grabación:** Añadir aviso legal visible: "Asegúrate de tener los derechos para grabar el contenido que estás capturando."
- **CORS en streams de radio:** Muchos streams funcionan directamente. El proxy solo se activa como fallback automático cuando el stream directo falla por CORS.
- **Codificación MP3:** `lamejs` es lento para ficheros grandes. Usar un `Web Worker` para el encoding y mostrar barra de progreso.
