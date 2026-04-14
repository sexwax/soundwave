import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

export function reactPlugin(): PluginOption {
  return react();
}
