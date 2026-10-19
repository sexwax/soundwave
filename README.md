# Soundwave

Reproductor de música y radio por internet moderno y minimalista.

**🎧 Demo en producción: [soundwave-woad.vercel.app](https://soundwave-woad.vercel.app)**

![Soundwave](https://img.shields.io/badge/React-19-black?logo=react&style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&style=flat)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite&style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

## Características

- **Reproductor de archivos locales**: Reproduce tu biblioteca de música con metadatos ID3, aleatorio y repetición (cola o pista) reales, crossfade, filtro de pistas y "Reabrir última carpeta"
- **Radio por internet**: Busca y escucha estaciones de todo el mundo vía [radio-browser.info](https://www.radio-browser.info/), con soporte HLS y reconexión automática
- **Ecualizador global de 10 bandas**: Un panel accesible desde cualquier página (MiniPlayer, reproductor local o radio), con presets y bypass
- **Sistema de favoritos**: Guarda y exporta/importa tus estaciones favoritas, con historial de reproducción local y de radio (persistencia IndexedDB)
- **Grabadora de audio**: Graba "Esta app", una pestaña o una ventana, con visualización VU en tiempo real — sobrevive a navegar a otra página mientras grabas
- **Visualizador de audio**: Espectro de audio en tiempo real con Web Audio API
- **Atajos de teclado**: reproducir/pausar, pistas, volumen, mute, ecualizador — pulsa `?` para ver la lista completa
- **3 temas visuales**: Dark (default), Light y Neon
- **PWA instalable**: iconos reales (incluido uno `maskable`), funciona offline con service worker y caché inteligente
- **Diseño responsive**: Funciona en desktop, tablet y móvil

## Stack Tecnológico

| Categoría | Tecnologías |
|-----------|-------------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Estilos | TailwindCSS 4 + CSS Variables |
| Estado | Zustand |
| Router | React Router DOM 7 |
| Audio | `<audio>` nativo + hls.js + Web Audio API |
| DB | Dexie.js (IndexedDB) |
| Animaciones | Framer Motion |
| Tests | Vitest + Playwright |

## Quick Start

```bash
# Clonar el repositorio
git clone https://github.com/sexwax/soundwave.git
cd soundwave

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:5173`

## Desplegar en Vercel

### Opción 1: Deploy automático (recomendado)

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio `sexwax/soundwave`
3. Vercel detectará automáticamente que es un proyecto Vite
4. Haz clic en **Deploy**

### Opción 2: Deploy con CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Iniciar sesión
vercel login

# Desplegar
vercel
```

### Configuración automática

El archivo `vercel.json` ya está configurado con:

- Framework: Vite
- Build: `npm run build`
- Output: `dist/`
- Preview: `npm run preview`

### Variables de Entorno en Vercel

Si usas las variables opcionales, configúralas en Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega:
   - `VITE_CORS_PROXY_URL`
   - `VITE_APP_URL`
4. Vuelve a desplegar para aplicar los cambios

## Comandos Disponibles

```bash
npm run dev          # Servidor de desarrollo con HMR
npm run build        # Compilar para producción
npm run preview      # Previsualizar build localmente
npm run lint         # Ejecutar ESLint
npm test             # Tests unitarios (watch mode)
npm run test:ui      # Tests con interfaz web
npm run test:e2e     # Tests E2E con Playwright
```

## Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
VITE_CORS_PROXY_URL=https://tu-proxy  # Proxy CORS para streams (ver sección "Proxy CORS")
VITE_APP_URL=https://tu-dominio.app   # URL base para share links
```

Todas son opcionales — la app funciona sin configuración.

## Proxy CORS

Algunas emisoras de radio no envían cabeceras CORS, así que el navegador bloquea su audio al intentar enrutarlo por el visualizador/ecualizador (y en algunos casos, directamente la reproducción). `proxy/cloudflare-worker.js` es un Worker mínimo que reenvía el stream añadiendo `Access-Control-Allow-Origin: *`, sin cachear nada (es audio en directo).

Desplegarlo:

```bash
npm i -g wrangler
wrangler login
wrangler deploy proxy/cloudflare-worker.js
```

Wrangler imprime la URL del Worker al terminar (algo como `https://cloudflare-worker.tu-cuenta.workers.dev`). Configúrala como `VITE_CORS_PROXY_URL` en tu `.env` (y en las variables de entorno de Vercel si despliegas ahí) y vuelve a construir. Sin esta variable, SoundWave sigue funcionando: simplemente no habrá fallback para las emisoras que bloqueen CORS.

## Estructura del Proyecto

```
src/
├── app/                    # Root, Router y Providers
│   ├── App.tsx
│   ├── Router.tsx
│   └── providers/
│       ├── AudioProvider.tsx       # expone el grafo singleton via contexto, no lo crea
│       ├── ThemeProvider.tsx
│       └── NotificationProvider.tsx
├── modules/                # Módulos autocontenidos
│   ├── player/             # Reproducción de archivos locales
│   │   ├── services/       #   localEngine.ts — el <audio> real, a nivel de módulo
│   │   └── store/
│   ├── radio/              # Radio por internet
│   │   └── services/       #   radioPlayer.ts, radioBrowserApi.ts
│   ├── favorites/          # Favoritos con IndexedDB
│   └── recorder/           # Grabadora de audio
│       └── services/       #   recorderService.ts — el MediaRecorder real, a nivel de módulo
├── pages/                  # Wrappers de rutas
├── shared/                 # Componentes y utilidades
│   ├── audio/              #   audioGraph.ts, playbackCoordinator.ts, eqStore.ts
│   ├── components/
│   ├── hooks/
│   └── utils/
├── types/                  # Ambient .d.ts (File System Access API)
└── styles/                 # Estilos globales y temas
    └── globals.css
```

## Arquitectura de Audio

```
AudioContext (singleton, shared/audio/audioGraph.ts)
    └── masterGainNode
        └── EQ [0-9] (BiquadFilterNode)
            └── analyserNode → destination
```

El `analyserNode` alimenta todos los visualizadores y el espectro del ecualizador. `localEngine` (archivos locales) y `radioPlayer` (radio, emisoras con CORS) enrutan sus elementos `<audio>` a `masterGainNode`; un `playbackCoordinator` se asegura de que solo una de las dos fuentes suene a la vez. No se usa Howler.js — ambos motores trabajan directamente sobre `<audio>` nativo, lo que permite enrutar cada stream de forma independiente según soporte CORS.

## Persistencia

Los favoritos se guardan en IndexedDB vía Dexie:

- `favorites` — Estaciones y tracks favoritos
- `collections` — Colecciones de usuario
- `history` — Historial de reproducción
- `tracks` — Metadatos de tracks escaneados
- `handles` — `FileSystemDirectoryHandle` de la última carpeta local abierta (para "Reabrir última carpeta")

## Atajos de teclado

Pulsa `?` dentro de la app para ver esta lista en un modal.

| Tecla | Acción |
|---|---|
| `Espacio` | Reproducir / pausar la fuente activa (radio o local) |
| `←` / `→` | Pista anterior / siguiente (solo local) |
| `Shift` + `←` / `→` | Retroceder / avanzar 10 segundos (solo local) |
| `↑` / `↓` | Subir / bajar volumen 5% |
| `M` | Silenciar / activar sonido |
| `E` | Abrir / cerrar el ecualizador |
| `?` | Mostrar esta ayuda |

## Compatibilidad de navegadores

- **Abrir carpeta** y **"Reabrir última carpeta"** usan la File System Access API — solo disponible en **Chrome y Edge** (basados en Chromium). En **Firefox** y el resto, "Abrir carpeta" cae automáticamente a la selección de carpeta clásica (`<input type="file" webkitdirectory>`); "Reabrir última carpeta" no aparece porque el navegador no puede guardar el permiso.
- El **grabador** usa el códec que cada navegador soporte vía `MediaRecorder`: Chrome/Edge y Firefox graban en WebM/Opus; **Safari** graba en **M4A** (AAC).
- El resto de funciones (radio, favoritos, ecualizador, atajos) funcionan igual en los navegadores modernos actuales.

## Aviso

- Las emisoras se obtienen de [radio-browser.info](https://www.radio-browser.info/) y pertenecen a sus respectivos emisores — SoundWave solo las reproduce, no las aloja ni reclama ningún derecho sobre su contenido.
- El grabador está pensado para uso personal (por ejemplo, guardar un fragmento que te gustó). Respeta los derechos de autor del contenido que grabes.

## Temas

Los temas se definen con CSS variables en `globals.css`:

```css
:root { /* Dark (default) */ }
[data-theme="light"] { /* Light theme */ }
[data-theme="neon"] { /* Neon theme */ }
```

El tema se persiste en `localStorage` y se aplica vía `data-theme` en `<html>`.

## Roadmap

- [ ] Soporte para Spotify/Apple Music
- [ ] Letras de canciones sincronizadas
- [ ] Modo fiesta con efectos visuales
- [ ] Compartir playlists
- [ ] Importar desde SoundCloud

## Contribuir

1. Haz un fork y crea una rama (`git checkout -b feature/nueva-funcion`)
2. Antes de abrir el PR, comprueba que todo sigue en verde:
   ```bash
   npm run lint && npx vitest run
   ```
3. Abre el Pull Request describiendo el cambio

## Licencia

MIT — ver [LICENSE](LICENSE) para más detalles.

## Autor y contacto

**Luis** — [github.com/sexwax](https://github.com/sexwax) — ia.cazurra.ai@gmail.com

¿Encontraste un bug o tienes una idea? Abre un [issue](https://github.com/sexwax/soundwave/issues). ¿Quieres algo a medida o colaborar en un proyecto? Escríbeme por email.

---

Hecho con ❤️ usando React, TypeScript y Web Audio API
