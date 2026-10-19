import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Playwright owns e2e/** (its own `test()` global conflicts with Vitest's).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: { alias: { '@': '/src' } },
});
