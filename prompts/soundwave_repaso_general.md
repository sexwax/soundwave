# SoundWave — Repaso general y mejora de funcionalidades

> Prompt para Claude Code. Pégalo entero en una sesión abierta en la raíz del repo
> (`C:\Users\palla\claude_2\soundwave`) o dile: «Lee `prompts/soundwave_repaso_general.md` y ejecútalo fase a fase».

## Rol y reglas de trabajo

Eres el desarrollador de SoundWave (React 19 + TS + Vite 8 + Zustand + Dexie + Tailwind 4). Lee primero `CLAUDE.md`.
Vas a corregir los bugs y aplicar las mejoras de este documento **fase a fase**.

1. Crea la rama `mejoras/repaso-general` desde `main` antes de tocar nada.
2. Al terminar cada fase ejecuta `npx tsc -b`, `npm run lint`, `npx vitest run` y `npm run build`. No pases a la siguiente fase con errores.
3. Haz un commit por fase con un mensaje en español (`fix:` / `feat:` / `refactor:` / `chore:`), igual que el historial actual.
4. Todo el texto visible de la UI va en español. Respeta las convenciones de `CLAUDE.md`: no uses `enum` ni `namespace` (`erasableSyntaxOnly`), usa el alias `@`, guarda los colores en variables CSS y mantén un store de Zustand por módulo.
5. No uses `alert()`. Los mensajes al usuario se muestran como toasts (ver Fase 1, `notify`).
6. Si algo de este plan choca con el código real, prioriza el comportamiento descrito en «Criterios de aceptación» y explícalo en el commit.
7. Al final actualiza `CLAUDE.md` (secciones «Audio pipeline», «Radio streaming», «State management» y «Tests») para que describa la nueva arquitectura.

Estado de partida, verificado: `tsc` sin errores, build correcto, **lint con 32 errores y 5 avisos**, y un único test (`1 + 1 === 2`).

---

## Diagnóstico (lo que está mal hoy)

| # | Problema | Dónde | Efecto |
|---|----------|-------|--------|
| 1 | `useAudioEngine()` se monta **dos veces**: en `AppInner` y en `LocalPlayer` (`const { seek } = useAudioEngine()`). Cada instancia tiene su propio `howlRef`. | `src/app/App.tsx:19`, `src/modules/player/components/LocalPlayer.tsx:16` | En la página Player la pista puede sonar duplicada. Al volver a esa página, el efecto de montaje reinicia la canción. `seek` solo actúa sobre una de las dos instancias. |
| 2 | `stopLocalPlayer()` nunca para nada: el efecto que copia `howlRef.current` a `currentHowlRef` se ejecuta una sola vez, cuando aún vale `null`. | `useAudioEngine.ts:34-42` | Al elegir una emisora, la música local sigue sonando. |
| 3 | El Play/Pausa de la radio (botón, barra espaciadora y Media Session) solo cambia `radioStore.isPlaying`, y nadie escucha ese cambio. | `RadioPage.tsx:163`, `useKeyboardShortcuts.ts`, `useMediaSession.ts` | El audio de la radio no se pausa ni se reanuda. |
| 4 | Las emisoras HLS (`station.hls === 1`) se pasan a Howler con `format: ['m3u8']`, que Chrome y Firefox no reproducen. `hls.js` está en `dependencies` pero no se usa. | `RadioPage.tsx:86` | Las emisoras HLS no suenan. |
| 5 | Howler (`html5: true`) reutiliza un pool interno de `<audio>`. Un elemento conectado antes a `createMediaElementSource` (archivo local) puede reutilizarse para un stream de radio cross-origin sin CORS, y entonces el grafo emite **silencio**. | `AudioProvider.tsx` + `useAudioEngine.ts:92-95` | La radio queda muda de forma intermitente después de haber usado el reproductor local. |
| 6 | La radio nunca pasa por el grafo de Web Audio. | `RadioPage.tsx` | El visualizador, el EQ y la grabación «Esta app» no funcionan con radio. |
| 7 | El `AudioContext` se crea dentro de un `useEffect` y se cierra en el cleanup. Con StrictMode se crea, se cierra y se vuelve a crear, y los nodos fuente de un contexto cerrado no se pueden reconectar. Además, el value del Provider lee refs durante el render (lint `react-hooks/refs`). | `AudioProvider.tsx` | Arquitectura frágil y errores de lint. |
| 8 | `AppInner`, `useKeyboardShortcuts` y `useMediaSession` hacen `usePlayerStore()` del store completo. Como `currentTime` cambia 5 veces por segundo, **toda la app se re-renderiza 5 veces por segundo** mientras suena algo. | `App.tsx`, `shared/hooks/*` | Rendimiento. |
| 9 | Activar Aleatorio regenera `shuffledQueue` pero mantiene `currentIndex`, así que salta a otra canción. `repeatMode` existe en el store pero **no tiene botón**. | `playerStore.ts:70`, `LocalPlayer.tsx` | UX rota. |
| 10 | `seek` solo funciona si está sonando. Shift+←/→ cambia `currentTime` en el store pero no mueve el audio. «Anterior» no reinicia la pista cuando han pasado más de 3 s. | `useAudioEngine.ts:150`, `useKeyboardShortcuts.ts:33,42` | Saltos que no funcionan. |
| 11 | En Favoritos, «Escuchar» navega a `/station/:uuid`, pero `RadioPage` solo busca esa emisora en `stations` (el top 100 ya cargado). | `FavoritesList.tsx:15`, `RadioPage.tsx:117-122` | Un favorito que no está en el top 100 no suena. |
| 12 | Una búsqueda desde la TopBar estando ya en `/radio` no hace nada, porque el efecto solo lee `?q=` al montar. | `RadioPage.tsx:34-38` | La búsqueda global falla. |
| 13 | Al hacer clic en una tarjeta de emisora se abre **siempre** el modal de detalle, además de reproducirla. | `RadioPage.tsx:40,265` | Resulta molesto. |
| 14 | `addHistory` no se llama nunca. | `favoritesStore.ts` | El historial siempre aparece vacío. |
| 15 | Los favoritos usan `key={fav.id}`, pero `id` siempre es `undefined` porque se guardan en localStorage. `flagEmoji('')` está hardcodeado y no se guarda `countrycode`. Votar no da ningún feedback. | `FavoritesList.tsx:59,72`, `StationDetail.tsx:21` | Avisos de React y UX pobre. |
| 16 | Grabador: si navegas a otra página mientras grabas, el componente se desmonta, `MediaRecorder` sigue activo y las refs se pierden. Al volver, el botón Stop no responde y el estado queda en `recording`. | `Recorder.tsx` | Bloqueo del grabador. |
| 17 | El EQ guarda las ganancias en un `useState` local. Al cerrar y reabrir el panel muestra «Flat» aunque los filtros sigan aplicados, y no se persiste nada. Además dibuja un espectro propio que llama a `getComputedStyle` en cada barra y en cada frame. | `Equalizer.tsx` | Desincronización y rendimiento. |
| 18 | Las preferencias (volumen, repetir, crossfade, EQ) se pierden al recargar. | `playerStore.ts` | UX. |
| 19 | `useLocalFiles` usa `alert()`, parsea **todos** los archivos con un único `Promise.all` (miles de archivos a la vez) y escribe en `db.tracks` unas `coverUrl` blob que dejan de valer al recargar, violando además la regla de que solo `favoritesStore` toca `db`. El mensaje dice que Firefox soporta `showDirectoryPicker`, y es falso. | `useLocalFiles.ts` | Memoria, UX y datos basura. |
| 20 | `public/icons/icon-192.png` e `icon-512.png` son **SVG renombrados** (503 bytes). | `public/icons/` | La instalación como PWA falla y los iconos no se ven. |
| 21 | Código muerto de la plantilla de Vite: `src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/{react.svg,vite.svg,hero.png}`. También sobran `FileTree.tsx` (importado pero sin usar), `useStreamCheck.ts` (ya no hace HEAD), `proxyHttp` de AllOrigins (no sirve para streams infinitos) y dos `formatTime` duplicados (`audioUtils.ts` y `formatters.ts`). | varios | Ruido. |
| 22 | Errores de lint: no-unused-vars, any, set-state-in-effect, refs, purity, preserve-manual-memoization, only-export-components. | ver `npm run lint` | La CI no está limpia. |

---

## Arquitectura objetivo

```
shared/audio/audioGraph.ts          ← AudioContext SINGLETON a nivel de módulo (no se cierra nunca)
shared/audio/playbackCoordinator.ts ← solo suena una fuente a la vez + qué fuente está activa
shared/utils/notify.ts              ← bus de toasts usable desde servicios (sustituye alert)

modules/player/services/localEngine.ts  ← <audio> DEDICADO para archivos locales (blob, mismo origen → enrutable al grafo)
modules/player/hooks/useAudioEngine.ts  ← SOLO se monta una vez (App); conecta store ↔ localEngine con store.subscribe
modules/player/store/playerStore.ts     ← cola + shuffle correcto + repeat + persist de preferencias
modules/player/store/eqStore.ts         ← ganancias EQ persistidas

modules/radio/services/radioPlayer.ts   ← 2 <audio> dedicados (CORS enrutado / plano) + hls.js + reintentos + token de sesión
modules/recorder/services/recorderService.ts ← sesión de grabación a nivel de módulo
```

**Se elimina Howler.js** (al final de la Fase 2). Con elementos `<audio>` dedicados desaparecen el problema del pool (#5) y los accesos a `(howl as any)._sounds`.

Tienes una implementación de referencia, ya compilada con `tsc` sin errores, de `audioGraph.ts`, `playbackCoordinator.ts`, `notify.ts`, `playerStore.ts` y `eqStore.ts` en el **Anexo** al final. Úsala tal cual o mejórala.

---

## Fase 1 — Núcleo de audio (bugs 1, 2, 5, 7, 8 y 10)

1. Crea `src/shared/audio/audioGraph.ts`, `playbackCoordinator.ts`, `src/shared/utils/notify.ts` y `src/modules/player/store/eqStore.ts`, y sustituye `src/modules/player/store/playerStore.ts` (todos en el Anexo). El nuevo `playerStore` mantiene los campos y acciones que ya existen, así que el resto del código sigue compilando.
2. **`AudioProvider`**: deja de crear el contexto. En un `useEffect` llama a `getAudioGraph()` y expón `{ audioContext, masterGainNode, analyserNode, eqNodes }` mediante `useState`, sin leer refs en el render. Elimina `connectMediaElement`. Mueve `useAudioContext` a `src/app/providers/useAudioContext.ts` para cumplir `react-refresh/only-export-components`. Haz lo mismo con `useTheme` y `useNotifications`.
3. **`NotificationProvider`**: suscríbete a `subscribeNotifications`. Genera los ids con `crypto.randomUUID()` dentro del callback (no en el render, lint `purity`) y haz `toast`/`removeToast` estables con `useCallback`.
4. **`localEngine.ts`** (nuevo, en `modules/player/services/`):
   - Mantén un `HTMLAudioElement` creado de forma perezosa a nivel de módulo (`preload='auto'`).
   - Conserva el registro `filePath → objectURL` (`registerFile`, `getFileUrl`) y añade `releaseFiles(keep: Set<string>)` para revocar las URLs que ya no están en la cola (incluidas las `coverUrl`).
   - `load(track)`: asigna `src` y reinicia el tiempo y la duración en el store.
   - `play()`: `claimPlayback('local')`, `await resumeAudio()`, `routeThroughGraph(el)` (los blobs son del mismo origen, así que no hay problema) y `el.play()`. Si falla con `NotAllowedError`, `setIsPlaying(false)`.
   - `pause()`, `seek(t)` (funciona también en pausa), `seekBy(delta)`, `previous()` (si `currentTime > 3` vuelve a 0; si no, `store.prevTrack()`) y `next()`.
   - Listeners del elemento:
     - `loadedmetadata` → `setDuration`.
     - `timeupdate` → `setCurrentTime`.
     - `ended` → `store.nextTrack()`.
     - `pause` → `setIsPlaying(false)` **solo si `!el.ended`**, porque `pause` se dispara justo antes de `ended` y no debe romper el avance automático.
     - `play` → sincroniza `setIsPlaying(true)`.
     - `error` → `notify('No se pudo reproducir …', 'error')` y salta a la siguiente pista tras 1 s si hay más.
   - Crossfade: con un `setInterval` de 100 ms mientras suena, `el.volume = base * min(1, t/cf, (dur-t)/cf)`, donde `base = isMuted ? 0 : volume`.
   - Registra en el coordinador `registerPlaybackSource('local', () => { pause(); setIsPlaying(false) })`.
5. **`useAudioEngine()`**: se monta **solo** en `AppInner` y no devuelve nada. Dentro de un único `useEffect`:
   - Llama a `usePlayerStore.subscribe((s, prev) => …)` y compara:
     - cambio de `selectCurrentTrack(s)?.filePath` o de `playTrigger` → `load` y, si `isPlaying`, `play`;
     - cambio de `isPlaying` → `play`/`pause`;
     - cambio de `volume`/`isMuted` → aplica el volumen.
   - Llama a `useEqStore.subscribe` → `setEqGains(effectiveGains(s))`, y aplica las ganancias guardadas al iniciar.
   - El efecto devuelve los `unsubscribe`.
   - **No** debe provocar renders en `AppInner`: nada de `usePlayerStore()` sin selector.
6. **`LocalPlayer`**: elimina `useAudioEngine()` y usa `localEngine.seek`, `localEngine.previous` y `localEngine.next`. Busca en todo el proyecto los `usePlayerStore()` y `useRadioStore()` sin selector y cámbialos por selectores con `useShallow` (`zustand/react/shallow`).
7. Mientras no llegue la Fase 2, `RadioPage` sigue usando Howler. En esta fase basta con que `RadioPage` llame a la función de parada de `localEngine` en lugar de a `stopLocalPlayer`, y con registrar `registerPlaybackSource('radio', stopRadio)` usando el `stopRadio` actual. Howler se desinstala al final de la Fase 2.

**Aceptación de la Fase 1:** al cargar una carpeta no empieza a sonar sola. Al hacer clic en una pista suena **una sola vez**. Ir a Radio y volver no reinicia la canción. El slider de progreso funciona en pausa. Shift+←/→ salta 10 s. Con React DevTools «Highlight updates», el layout no parpadea mientras suena.

## Fase 2 — Radio (bugs 3, 4, 6, 11, 12 y 13)

1. Reescribe **`modules/radio/services/radioPlayer.ts`** como el único dueño de la reproducción de radio:
   - Usa dos elementos `<audio>` de módulo: `corsEl` (`crossOrigin='anonymous'`, enrutado al grafo la primera vez que suena) y `plainEl` (sin CORS y **nunca** enrutado).
   - Añade una función pura y exportada `buildStreamAttempts(station, proxyUrl)` que devuelva la lista ordenada de intentos `{ url, el: 'cors' | 'plain', hls: boolean }`. Para cada URL candidata (`proxify(url)` si hay proxy, y la URL directa, sin duplicados), primero `cors` y después `plain`. Si es HLS, solo `cors` (hls.js usa fetch/XHR) y, en Safari, si `canPlayType('application/vnd.apple.mpegurl')`, también `plain` nativo.
   - **HLS:** `const { default: Hls } = await import('hls.js')` (import dinámico para no engordar el bundle). Destruye la instancia anterior al cambiar de emisora o al parar.
   - `playStation(station)`:
     - incrementa un `session` token (todos los callbacks comprueban el token, para que los clics rápidos no dejen streams huérfanos);
     - `claimPlayback('radio')` y `setStatus('connecting')`;
     - recorre los intentos con un **timeout de 8 s** por intento hasta recibir `playing`;
     - en `playing`: `setStatus('playing')`, `setRouted(el === corsEl)`, `registerClick` y `addHistory({ type: 'radio', title: station.name, artist: station.country, stationuuid })`;
     - si fallan todos, `setStatus('error')` y `notify('No se pudo conectar con …', 'error')`.
   - **Reconexión:** si un stream que estaba sonando emite `error`, `ended` o `stalled` durante más de 10 s, reintenta hasta 3 veces con backoff de 1, 2 y 4 s (como ya promete `CLAUDE.md`).
   - `pauseRadio()`: corta el stream (`removeAttribute('src')` + `load()`, `hls.destroy()`) y pone `status: 'paused'`. `resumeRadio()` vuelve a ejecutar `playStation(current)`, porque en un stream en directo reanudar un buffer viejo da desfase. `toggleRadio()` alterna entre ambos. `stopRadio()` pone `status: 'idle'`.
   - El volumen se sincroniza con `playerStore` (`volume`/`isMuted`) mediante `subscribe`. El volumen es global para toda la app.
   - Registra en el coordinador: `registerPlaybackSource('radio', stopRadio)`.
2. **`radioStore`**: añade `'paused'` al tipo `status` y un campo `routed: boolean`. Elimina `isPlaying` o derívalo de `status === 'playing'`.
3. **`radioBrowserApi`**: añade `byUuid(uuid)` → `/stations/byuuid?uuids=…`, con el tipo `RadioStation[]` (quita los `as RadioStation[]`). Haz que `vote` devuelva `{ ok, message }`.
4. **`RadioPage`**:
   - elimina toda la lógica de Howler y llama al servicio;
   - el botón ⏯ llama a `toggleRadio()`;
   - etiqueta el estado en español (Conectando…, En directo, En pausa, Error, Reintentar);
   - si `routed === false`, muestra bajo el visualizador: «Visualizador y EQ no disponibles para esta emisora (el servidor no permite CORS)»;
   - **deep link:** reacciona a `uuid`. Si la emisora no está en `stations`, la pide con `byUuid` y la reproduce. Hazlo en un handler async fuera del cuerpo del efecto, o con un flag `cancelled`, para evitar `set-state-in-effect`;
   - **búsqueda:** reacciona a cambios de `searchParams.get('q')` (no solo al montar) y rellena también `searchQuery` del store para que el input lo muestre.
5. **`StationCard`**: el clic **solo reproduce**. Añade un botón ⓘ (`aria-label="Detalles"`, con `stopPropagation`) que abre el modal de `StationDetail`.
6. Desinstala Howler (`npm uninstall howler @types/howler --legacy-peer-deps`) y comprueba que no queda ningún import de `howler`.
7. Borra `useStreamCheck.ts` y `proxyHttp`/AllOrigins de `corsProxy.ts`. Actualiza `.env.example` para que `VITE_CORS_PROXY_URL` vaya vacío y con un comentario.

**Aceptación de la Fase 2:**
- ⏯, la barra espaciadora y la tecla multimedia pausan y reanudan la radio de verdad.
- Una emisora HLS suena en Chrome.
- Hacer clic en 5 emisoras seguidas deja **solo la última** sonando.
- Elegir una emisora para la música local, y darle a play en local para la radio.
- Con una emisora que permita CORS se mueve el visualizador y el EQ tiene efecto.
- «Escuchar» en Favoritos funciona aunque la emisora no esté en el top.
- Buscar desde la TopBar estando en /radio actualiza los resultados.

## Fase 3 — Reproductor local: UX (bugs 9, 17, 18 y 19)

1. El `playerStore` del Anexo (ya aplicado en la Fase 1) incluye todo lo que necesita esta fase:
   - shuffle que mantiene la pista actual;
   - `appendToQueue`, `clearQueue`, `playIndex` (si se pulsa la pista actual, la reinicia) y `cycleRepeatMode`;
   - `prevTrack` con vuelta al final si repeat = queue;
   - `nextTrack` con cola de una pista y repeat = queue;
   - `persist` de volume, isMuted, repeatMode y crossfade.
2. **`LocalPlayer`**:
   - botón **Repetir**, que cicla 🔁 desactivado → 🔁 cola → 🔂 pista y muestra el estado;
   - **«Añadir archivos»** (`appendToQueue`), separado de «Abrir archivos», que reemplaza la cola;
   - **«Vaciar cola»**;
   - un campo **«Filtrar pistas…»** que filtra por título, artista o álbum. `TrackList` filtra conservando el índice real de cada fila, y la virtualización trabaja sobre las filas filtradas;
   - quita el import de `FileTree` y `handleSelectTrack`, y borra `FileTree.tsx`;
   - mueve los estilos inline repetidos de los botones de modo del visualizador a un componente `VisModeToggle` en `shared/components/audio/`. Ese componente también lo usa `RadioPage`.
3. **`useLocalFiles`**:
   - sin `alert`: usa `notify`;
   - sin escribir en `db.tracks`;
   - parseo con **concurrencia limitada** (pool de 6) y progreso «Indexando 120/800» expuesto por el hook;
   - ordena las pistas por ruta relativa (guarda `relativePath` recorriendo el handle);
   - si `showDirectoryPicker` no existe (Firefox), usa como alternativa un `<input type="file" webkitdirectory multiple>`;
   - **«Reabrir última carpeta»:** guarda el `FileSystemDirectoryHandle` en IndexedDB. Para ello añade en `favoritesDb` `version(2)` con la tabla `handles: 'key'`, y expón `saveDirHandle`/`getDirHandle` en `favoritesStore`. Al pulsar el botón, llama a `handle.requestPermission({ mode: 'read' })` y vuelve a indexar. El botón solo aparece si hay un handle guardado y el navegador lo soporta;
   - al reemplazar la cola, llama a `releaseFiles` con las rutas nuevas.
4. **EQ**: usa `eqStore.ts` (Anexo). `Equalizer.tsx` lee y escribe el store, sin estado local de ganancias. Añade un interruptor «EQ activado» (bypass) y el botón «Reset». Sustituye su canvas de espectro por `<Visualizer mode="bars" />` y quita los `as any` de los estilos del slider vertical (tipa `CSSProperties` y usa `writingMode: 'vertical-lr'`, `direction: 'rtl'`).
5. **`Visualizer`**:
   - corrige el lint (`useState` sin usar y el ternario como sentencia);
   - lee los colores del tema en cada frame (un solo `getComputedStyle` por frame, no uno por barra) para que cambien al cambiar de tema;
   - escala el canvas con `devicePixelRatio`;
   - el modo circular usa `secondary` alternando.

**Aceptación de la Fase 3:** activar o desactivar Aleatorio no cambia la canción que suena. Repetir pista o cola funciona. «Anterior» después de 3 s reinicia la pista. Al recargar se mantienen volumen, repetir, crossfade y EQ. Cerrar y reabrir el EQ muestra las ganancias reales. Una carpeta de más de 1000 archivos se indexa sin colgar la pestaña y mostrando progreso.

## Fase 4 — Favoritos e historial (bugs 14 y 15)

1. Guarda `countrycode` en `FavoriteStation`. Las favoritas antiguas sin ese campo muestran 🌐. Usa `key={fav.stationuuid}`.
2. Llama a `addHistory` para local desde `localEngine` en el primer `playing` de cada pista (`type: 'local'`, title, artist, filePath), y para radio desde `radioPlayer` (Fase 2). Evita duplicados consecutivos de la misma entrada.
3. Añade **«Importar JSON»**: un input de archivo que valida que cada objeto tenga `stationuuid`, `name` y `url`, hace merge sin duplicados y muestra el toast «X favoritos importados». Añade también **«Borrar historial»** con confirmación inline (no `confirm()` nativo) y `db.history.clear()` vía `favoritesStore`.
4. En el historial, permite volver a escuchar con un clic las entradas de radio.
5. **`StationDetail`**: el voto muestra un toast con el resultado y desactiva el botón tras votar. Elimina `isPlaying` sin usar.
6. **`SharePanel`**: añade un fallback si `navigator.clipboard` no existe (input seleccionado + mensaje) y usa `navigator.share` cuando esté disponible (botón «Compartir…»). Calcula los colores del QR a partir de las variables del tema.

## Fase 5 — Grabador (bug 16)

1. Crea `modules/recorder/services/recorderService.ts` con el `MediaRecorder`, el stream, el `MediaStreamAudioDestinationNode`, el temporizador y el medidor de nivel **a nivel de módulo**. Exporta `start(source)`, `stop()` y `pauseResume()`. El componente solo pinta y llama a esas funciones, así que navegar mientras se graba ya no rompe nada.
2. Fuente «Esta app»: `getAudioGraph().analyser.connect(dest)`. Si `usePlaybackStore.active === 'radio'` y `radioStore.routed === false`, muestra el aviso «Esta emisora no se puede grabar desde la app (sin CORS); usa el modo Pestaña».
3. Cambia todos los `alert()` por `notify`. Tipa `getDisplayMedia` sin `any` (`DisplayMediaStreamOptions`) y `showSaveFilePicker` con una interfaz mínima declarada en `src/types/fs-access.d.ts`. Controla el `AbortError` del diálogo de guardar.
4. Muestra en `Sidebar` un punto rojo parpadeante junto a «Grabar» cuando `status === 'recording'`.
5. Usa `getFileExtFromMime(mr.mimeType)`, el mimeType real del recorder, en lugar de recalcularlo.

## Fase 6 — Atajos, Media Session y MiniPlayer

1. **`useKeyboardShortcuts`**: registra un solo listener con `[]` como dependencias y lee todo con `getState()`.
   - Ignora la pulsación si el foco está en `INPUT`, `TEXTAREA`, `SELECT` o en un elemento `contentEditable`.
   - **Espacio:** ignóralo si el foco está en un `BUTTON` (para no duplicar el clic). Si no, alterna la fuente activa del coordinador (`radio` → `toggleRadio`, `local` → play/pause local).
   - ←/→ → pista anterior o siguiente (solo en local).
   - Shift+←/→ → `localEngine.seekBy(∓10)`.
   - ↑/↓ → volumen ±5 %.
   - M → silencio.
   - Añade la ayuda de atajos en un modal que se abre con la tecla `?`.
2. **`useMediaSession`**:
   - `metadata` según la fuente activa (no «local primero»);
   - `playbackState`;
   - `setPositionState` en local;
   - handlers `seekto`, `seekbackward` y `seekforward` en local, y en radio a `null`;
   - limpia los handlers en el cleanup.
3. **`MiniPlayer`**:
   - muestra la fuente activa (radio aunque haya una cola local cargada);
   - quita `timeDisplay`, `formatTimeStable` y `useMemo` sin usar;
   - el slider de volumen muestra 0 si está en silencio;
   - un clic en el bloque de información navega a la página de la fuente (`/` o `/radio`);
   - **no** vuelvas a añadir controles de play: se quitaron a propósito en commits anteriores.
4. **`App.tsx`**: `useEffect(() => { void useFavoritesStore.getState().load() }, [])`, sin `exhaustive-deps`.

## Fase 7 — Limpieza, PWA y documentación (bugs 20, 21 y 22)

1. Borra `src/App.tsx`, `src/App.css`, `src/index.css`, `src/assets/react.svg`, `src/assets/vite.svg` y `src/assets/hero.png`, comprobando antes con grep que no se importan. Unifica `formatTime` en `shared/utils/formatters.ts` y borra los duplicados de `audioUtils.ts`.
2. **Iconos PWA:** genera PNG reales de 192 y 512 px a partir de `public/icons/icon.svg`, por ejemplo con `npx sharp-cli` o un script de Node con `sharp` como devDependency temporal. Añade además un icono `maskable` de 512 px con margen de seguridad y decláralo en el manifest con `purpose: 'maskable'`. Comprueba con `file public/icons/*.png` que sean PNG.
3. Cambia la descripción del manifest a español («Reproductor de música local, radio online y grabador»).
4. En Workbox, añade `CacheFirst` con expiración de 30 días para los favicons de emisoras (cross-origin, `cacheableResponse: { statuses: [0, 200] }`, `maxEntries: 300`).
5. Deja `npm run lint` con **0 errores**. Si para `react-hooks/incompatible-library` de `useVirtualizer` hace falta un `eslint-disable-next-line`, justifícalo en un comentario.
6. Actualiza `CLAUDE.md` con la nueva arquitectura y elimina toda mención a Howler. Actualiza también `README.md` con las funciones nuevas y los atajos.

## Fase 8 — Tests

Añade un setup en `src/__tests__/setup.ts`, referenciado desde `vitest.config.ts` (`setupFiles`), con un mock mínimo de `HTMLMediaElement.prototype.play/pause/load` y de `AudioContext`. Escribe estos tests:

- **`playerStore.test.ts`**
  - `toggleShuffle` mantiene la pista actual al activar y al desactivar.
  - `nextTrack` cubre repeat none (para al final), queue (vuelve a 0) y track (incrementa `playTrigger`), y la cola de una sola pista.
  - `prevTrack` en el índice 0 con y sin repeat queue.
  - `appendToQueue` no duplica y funciona con la cola vacía.
  - `playIndex` sobre la pista actual incrementa `playTrigger`.
  - `partialize` solo persiste las preferencias.
- **`eqStore.test.ts`**: presets, `setGain` pasa a `Custom` y `effectiveGains` con el EQ en bypass.
- **`radioAttempts.test.ts`**: `buildStreamAttempts` con y sin proxy, HLS, URLs duplicadas y `url_resolved` vacío.
- **`playbackCoordinator.test.ts`**: `claimPlayback` para la otra fuente y actualiza `active`.
- **`formatters.test.ts`**: `formatTime` (0, NaN, Infinity, 59, 61, 3600) y `flagEmoji`.
- **`localEngine.test.ts`**: `ended` llama a `nextTrack`. Un `pause` con `ended=true` no pone `isPlaying` a false. `previous()` con más de 3 s hace seek a 0.
- **E2E (Playwright)** en `e2e/smoke.spec.ts`:
  - la app carga y se puede navegar por las 4 rutas sin errores en consola;
  - cambiar de tema actualiza `data-theme`;
  - `/station/uuid-inexistente` no rompe la página.

---

## Criterios de aceptación finales (checklist manual)

- [ ] Abrir carpeta → no suena hasta pulsar una pista. La pista suena una sola vez, y ir a Radio y volver no la reinicia.
- [ ] Aleatorio y Repetir funcionan y no cambian la canción actual. Se pueden añadir archivos a la cola y vaciarla, y el filtro de pistas funciona.
- [ ] El slider de progreso y Shift+←/→ funcionan, también en pausa.
- [ ] Radio: ⏯, la barra espaciadora y las teclas multimedia pausan y reanudan. Las emisoras HLS suenan. Con clics rápidos solo suena la última emisora.
- [ ] Local y radio nunca suenan a la vez.
- [ ] El visualizador y el EQ funcionan con local y con las emisoras que permiten CORS, y aparece el aviso con las que no.
- [ ] Favoritos: «Escuchar» funciona siempre. Importar y exportar JSON funcionan. El historial se llena y se puede borrar.
- [ ] Grabador: grabar, ir a otra página y volver permite parar y guardar la grabación.
- [ ] Al recargar se mantienen volumen, EQ, repetir, crossfade y tema. «Reabrir última carpeta» funciona en Chrome y Edge.
- [ ] `npx tsc -b`, `npm run lint` (0 errores), `npx vitest run` y `npm run build` en verde, y la PWA se puede instalar con iconos PNG válidos.
- [ ] `CLAUDE.md` y `README.md` actualizados. Un commit por fase en la rama `mejoras/repaso-general`, sin merge a `main` (lo revisa Luis).

---

## Anexo — Implementación de referencia (compila con el `tsconfig` actual)

### `src/shared/audio/audioGraph.ts`

```ts
/**
 * Singleton Web Audio graph shared by the whole app.
 *
 *   source(s) → masterGain → eq[0..9] → analyser → destination
 *
 * It lives at module scope (not inside a React effect) so it is created exactly
 * once, survives StrictMode double-mounting and can be used from non-React
 * services (local engine, radio player, recorder).
 */

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  eqNodes: BiquadFilterNode[];
  analyser: AnalyserNode;
}

let graph: AudioGraph | null = null;

// createMediaElementSource() can only be called once per element, ever.
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export function isWebAudioSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

/** Returns the graph, creating it on first call. Returns null if Web Audio is unavailable. */
export function getAudioGraph(): AudioGraph | null {
  if (graph) return graph;
  if (!isWebAudioSupported()) return null;

  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 1;

  const eqNodes = EQ_FREQUENCIES.map((freq) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = 1.4;
    filter.gain.value = 0;
    return filter;
  });

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  master.connect(eqNodes[0]);
  for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
  eqNodes[eqNodes.length - 1].connect(analyser);
  analyser.connect(ctx.destination);

  graph = { ctx, master, eqNodes, analyser };
  return graph;
}

/**
 * Routes a media element through the graph (EQ + analyser).
 * WARNING: only route elements whose media is same-origin or CORS-enabled —
 * a tainted cross-origin source outputs silence once routed, and routing is permanent.
 */
export function routeThroughGraph(el: HTMLMediaElement): boolean {
  if (sources.has(el)) return true;
  const g = getAudioGraph();
  if (!g) return false;
  try {
    const src = g.ctx.createMediaElementSource(el);
    src.connect(g.master);
    sources.set(el, src);
    return true;
  } catch (err) {
    console.warn('[audioGraph] could not route element', err);
    return false;
  }
}

export function isRouted(el: HTMLMediaElement): boolean {
  return sources.has(el);
}

/** Browsers start the context suspended until a user gesture. Call this from play actions. */
export async function resumeAudio(): Promise<void> {
  const g = getAudioGraph();
  if (g && g.ctx.state !== 'running') {
    try { await g.ctx.resume(); } catch { /* ignore: will retry on next gesture */ }
  }
}

export function setEqGains(gains: readonly number[]): void {
  const g = getAudioGraph();
  if (!g) return;
  gains.forEach((gain, i) => {
    const node = g.eqNodes[i];
    if (node) node.gain.setTargetAtTime(gain, g.ctx.currentTime, 0.02);
  });
}
```

### `src/shared/audio/playbackCoordinator.ts`

```ts
import { create } from 'zustand';

/**
 * Ensures only one audio source plays at a time and tracks which one the user
 * used last (drives MiniPlayer, keyboard shortcuts and Media Session).
 */
export type PlaybackSource = 'local' | 'radio';

interface PlaybackState {
  active: PlaybackSource | null;
}

export const usePlaybackStore = create<PlaybackState>(() => ({ active: null }));

const stoppers = new Map<PlaybackSource, () => void>();

export function registerPlaybackSource(source: PlaybackSource, stop: () => void): void {
  stoppers.set(source, stop);
}

/** Marks `source` as active and stops every other registered source. */
export function claimPlayback(source: PlaybackSource): void {
  for (const [name, stop] of stoppers) {
    if (name !== source) stop();
  }
  if (usePlaybackStore.getState().active !== source) {
    usePlaybackStore.setState({ active: source });
  }
}

export function getActiveSource(): PlaybackSource | null {
  return usePlaybackStore.getState().active;
}
```

### `src/shared/utils/notify.ts`

```ts
/**
 * Tiny event bus so non-React code (services, stores) can show toasts.
 * NotificationProvider subscribes and renders them.
 */
export type NotifyType = 'info' | 'success' | 'warning' | 'error';

type Listener = (message: string, type: NotifyType) => void;

const listeners = new Set<Listener>();

export function notify(message: string, type: NotifyType = 'info'): void {
  if (listeners.size === 0) {
    // No UI mounted (tests, early boot) — keep the message visible somewhere.
    console.info(`[notify:${type}]`, message);
    return;
  }
  listeners.forEach((l) => l(message, type));
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
```

### `src/modules/player/store/playerStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalTrack } from '../../favorites/db/favoritesDb';

export type RepeatMode = 'none' | 'track' | 'queue';

interface PlayerState {
  /** Tracks in the order they were loaded. */
  queue: LocalTrack[];
  /** Play order while shuffle is on (same tracks as `queue`). */
  shuffledQueue: LocalTrack[];
  /** Index into the *active* list (shuffledQueue when shuffled, queue otherwise). */
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  balance: number;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  crossfadeDuration: number;
  currentTime: number;
  duration: number;
  /** Bumped to force the engine to (re)start the current track. */
  playTrigger: number;

  setQueue: (tracks: LocalTrack[], startIndex?: number) => void;
  appendToQueue: (tracks: LocalTrack[]) => void;
  clearQueue: () => void;
  setCurrentIndex: (index: number) => void;
  playIndex: (index: number) => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  toggleMute: () => void;
  setBalance: (v: number) => void;
  setRepeatMode: (v: RepeatMode) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setCrossfade: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  currentTrack: () => LocalTrack | null;
}

export function fisherYates<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle keeping `first` (if any) at position 0 so the current song keeps playing. */
function shuffleWithFirst(tracks: readonly LocalTrack[], first: LocalTrack | null): LocalTrack[] {
  if (!first) return fisherYates(tracks);
  const rest = tracks.filter((t) => t.filePath !== first.filePath);
  return [first, ...fisherYates(rest)];
}

type ListState = Pick<PlayerState, 'queue' | 'shuffledQueue' | 'isShuffled' | 'currentIndex'>;

export function activeList(s: ListState): LocalTrack[] {
  return s.isShuffled && s.shuffledQueue.length === s.queue.length ? s.shuffledQueue : s.queue;
}

export function selectCurrentTrack(s: ListState): LocalTrack | null {
  return activeList(s)[s.currentIndex] ?? null;
}

const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = { none: 'queue', queue: 'track', track: 'none' };

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      shuffledQueue: [],
      currentIndex: 0,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      balance: 0,
      repeatMode: 'none',
      isShuffled: false,
      crossfadeDuration: 0,
      currentTime: 0,
      duration: 0,
      playTrigger: 0,

      setQueue: (tracks, startIndex = 0) => {
        const start = tracks[startIndex] ?? null;
        const { isShuffled } = get();
        set({
          queue: tracks,
          shuffledQueue: isShuffled ? shuffleWithFirst(tracks, start) : fisherYates(tracks),
          currentIndex: isShuffled ? 0 : startIndex,
          currentTime: 0,
          duration: 0,
        });
      },

      appendToQueue: (tracks) => {
        const { queue, shuffledQueue } = get();
        const known = new Set(queue.map((t) => t.filePath));
        const fresh = tracks.filter((t) => !known.has(t.filePath));
        if (fresh.length === 0) return;
        if (queue.length === 0) {
          get().setQueue(fresh, 0);
          return;
        }
        set({ queue: [...queue, ...fresh], shuffledQueue: [...shuffledQueue, ...fisherYates(fresh)] });
      },

      clearQueue: () =>
        set({ queue: [], shuffledQueue: [], currentIndex: 0, isPlaying: false, currentTime: 0, duration: 0 }),

      setCurrentIndex: (index) => set({ currentIndex: index }),

      playIndex: (index) => {
        const { currentIndex } = get();
        if (index === currentIndex) {
          // Clicking the current track restarts it.
          set((s) => ({ isPlaying: true, playTrigger: s.playTrigger + 1 }));
        } else {
          set({ currentIndex: index, isPlaying: true });
        }
      },

      setIsPlaying: (v) => set({ isPlaying: v }),
      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), ...(v > 0 ? { isMuted: false } : {}) }),
      setMuted: (v) => set({ isMuted: v }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setBalance: (v) => set({ balance: v }),
      setRepeatMode: (v) => set({ repeatMode: v }),
      cycleRepeatMode: () => set((s) => ({ repeatMode: REPEAT_CYCLE[s.repeatMode] })),

      toggleShuffle: () => {
        const s = get();
        const current = selectCurrentTrack(s);
        if (!s.isShuffled) {
          set({ isShuffled: true, shuffledQueue: shuffleWithFirst(s.queue, current), currentIndex: 0 });
        } else {
          const idx = current ? s.queue.findIndex((t) => t.filePath === current.filePath) : 0;
          set({ isShuffled: false, currentIndex: Math.max(0, idx) });
        }
      },

      setCrossfade: (v) => set({ crossfadeDuration: v }),
      setCurrentTime: (v) => set({ currentTime: v }),
      setDuration: (v) => set({ duration: v }),

      nextTrack: () => {
        const { currentIndex, repeatMode } = get();
        const len = activeList(get()).length;
        if (len === 0) return;
        if (repeatMode === 'track') {
          set((s) => ({ playTrigger: s.playTrigger + 1 }));
          return;
        }
        if (currentIndex < len - 1) set({ currentIndex: currentIndex + 1 });
        else if (repeatMode === 'queue') {
          // Same index when the queue has a single track → force restart.
          if (len === 1) set((s) => ({ playTrigger: s.playTrigger + 1 }));
          else set({ currentIndex: 0 });
        } else set({ isPlaying: false });
      },

      prevTrack: () => {
        const { currentIndex, repeatMode } = get();
        const len = activeList(get()).length;
        if (len === 0) return;
        if (currentIndex > 0) set({ currentIndex: currentIndex - 1 });
        else if (repeatMode === 'queue' && len > 1) set({ currentIndex: len - 1 });
        else set((s) => ({ playTrigger: s.playTrigger + 1 }));
      },

      currentTrack: () => selectCurrentTrack(get()),
    }),
    {
      name: 'soundwave-player',
      version: 1,
      // Only user preferences are persisted: local File objects can't survive a reload.
      partialize: (s) => ({
        volume: s.volume,
        isMuted: s.isMuted,
        repeatMode: s.repeatMode,
        crossfadeDuration: s.crossfadeDuration,
      }),
    },
  ),
);
```

### `src/modules/player/store/eqStore.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const EQ_BAND_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 2, 4, 6, 8, 8],
  Vocal: [-2, -2, 0, 2, 4, 4, 3, 1, 0, -1],
  Rock: [6, 4, 2, 0, -2, 0, 2, 4, 4, 4],
  Jazz: [4, 2, 0, 2, -2, -2, 0, 2, 4, 4],
  Pop: [-2, -1, 2, 4, 4, 3, 1, -1, -2, -2],
  Classical: [4, 4, 2, 0, -2, -2, 0, 2, 4, 4],
};

interface EqState {
  enabled: boolean;
  gains: number[];
  preset: string;
  setGain: (index: number, value: number) => void;
  applyPreset: (name: string) => void;
  setEnabled: (v: boolean) => void;
}

export const useEqStore = create<EqState>()(
  persist(
    (set) => ({
      enabled: true,
      gains: [...EQ_PRESETS.Flat],
      preset: 'Flat',
      setGain: (index, value) =>
        set((s) => {
          const gains = [...s.gains];
          gains[index] = value;
          return { gains, preset: 'Custom' };
        }),
      applyPreset: (name) => {
        const values = EQ_PRESETS[name];
        if (values) set({ gains: [...values], preset: name });
      },
      setEnabled: (v) => set({ enabled: v }),
    }),
    { name: 'soundwave-eq', version: 1 },
  ),
);

/** Gains actually sent to the filters (all zero when the EQ is bypassed). */
export function effectiveGains(s: Pick<EqState, 'enabled' | 'gains'>): number[] {
  return s.enabled ? s.gains : s.gains.map(() => 0);
}
```
