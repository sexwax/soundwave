import { VitePWA } from 'vite-plugin-pwa';
import type { PluginOption } from 'vite';

export function pwaPlugin(): PluginOption {
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/*.png', 'icons/*.svg'],
    manifest: {
      name: 'SoundWave',
      short_name: 'SoundWave',
      description: 'Reproductor de música local, radio online y grabador',
      theme_color: '#080b12',
      background_color: '#080b12',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.radio-browser\.info\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'radio-api-cache', expiration: { maxAgeSeconds: 300 } },
        },
        // Radio station favicons: cross-origin, served from whatever host the
        // station itself uses. Many respond opaque (status 0) since they rarely
        // set CORS headers, so cacheableResponse must explicitly allow that.
        {
          urlPattern: ({ request, sameOrigin }) => !sameOrigin && request.destination === 'image',
          handler: 'CacheFirst',
          options: {
            cacheName: 'station-favicon-cache',
            cacheableResponse: { statuses: [0, 200] },
            expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true },
          },
        },
        {
          urlPattern: /\.(png|jpg|svg|ico)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'image-cache', expiration: { maxEntries: 500 } },
        },
      ],
      navigateFallback: '/index.html',
    },
  });
}
