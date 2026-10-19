import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light' | 'neon';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeCtx = createContext<ThemeContextValue>({ theme: 'dark', setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}
