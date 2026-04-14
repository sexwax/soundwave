import tailwindcss from '@tailwindcss/vite';
import type { PluginOption } from 'vite';

export function tailwindPlugin(): PluginOption {
  return tailwindcss();
}
