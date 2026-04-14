import { useCallback, useState } from 'react';
import { proxify } from '../../../shared/utils/corsProxy';

export function useStreamCheck() {
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (url: string): Promise<boolean> => {
    // Skip HEAD check - many radio streams don't support HEAD requests
    // Instead, we try to play directly and handle errors via Howler callbacks
    // Just validate it's a valid URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { check, checking };
}
