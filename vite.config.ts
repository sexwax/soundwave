import { defineConfig } from 'vite';
import { reactPlugin, tailwindPlugin, pwaPlugin } from './config/plugins';

export default defineConfig({
  plugins: [
    reactPlugin(),
    tailwindPlugin(),
    pwaPlugin(),
  ],
  resolve: { alias: { '@': '/src' } },
});
