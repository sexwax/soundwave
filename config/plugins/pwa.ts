import { VitePWA } from 'vite-plugin-pwa';
import type { PluginOption } from 'vite';

export function pwaPlugin(): PluginOption {
  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icons/*.png', 'icons/*.svg'],
    manifest: {
      name: 'SoundWave',
      short_name: 'SoundWave',
      description: 'Professional web music app',
      theme_color: '#080b12',
      background_color: '#080b12',
      display: 'standalone',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.radio-browser\.info\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'radio-api-cache', expiration: { maxAgeSeconds: 300 } },
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
