# Soundwave

Reproductor de música y radio por internet moderno y minimalista.

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
   - `VITE_LASTFM_API_KEY`
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
VITE_LASTFM_API_KEY=tu_api_key       # Arte de álbumes desde Last.fm
VITE_CORS_PROXY_URL=https://tu-proxy  # Proxy CORS para streams
VITE_APP_URL=https://soundwave.app    # URL base para share links
```

Todas son opcionales — la app funciona sin configuración.

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

## Temas

Los temas se definen con CSS variables en `globals.css`:

```css
:root { /* Dark (default) */ }
[data-theme="light"] { /* Light theme */ }
[data-theme="neon"] { /* Neon theme */ }
```

El tema se persiste en `localStorage` y se aplica vía `data-theme` en `<html>`.

## Capturas

> Agrega screenshots de la app aquí:
> - Vista del reproductor principal
> - Vista de radio con búsqueda
> - Lista de favoritos
> - Grabadora con VU meter

## Roadmap

- [ ] Soporte para Spotify/Apple Music
- [ ] Letras de canciones sincronizadas
- [ ] Modo fiesta con efectos visuales
- [ ] Compartir playlists
- [ ] Importar desde SoundCloud

## Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcion`)
3. Committea tus cambios (`git commit -m 'feat: agrega nueva función'`)
4. Push a la rama (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

## Licencia

MIT — ver [LICENSE](LICENSE) para más detalles.

## Autor

**sexwax** — [GitHub](https://github.com/sexwax/soundwave)

---

Hecho con ❤️ usando React, TypeScript y Web Audio API
