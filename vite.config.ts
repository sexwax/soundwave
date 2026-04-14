import { defineConfig } from 'vite';
import { reactPlugin, tailwindPlugin, pwaPlugin } from './config/plugins';

export default defineConfig({
  plugins: [
    reactPlugin(),
    tailwindPlugin(),
    pwaPlugin(),
  ],
  resolve: { alias: { '@': '/src' } },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress eval warning from file-type (transitive dep of music-metadata-browser)
        if (warning.code === 'EVAL' && warning.id?.includes('file-type')) return;
        warn(warning);
      },
    },
  },
});
