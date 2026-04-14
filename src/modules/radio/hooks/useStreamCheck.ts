import { useCallback, useState } from 'react';
import { checkStreamAvailability } from '../../../shared/utils/corsProxy';

export function useStreamCheck() {
  const [checking, setChecking] = useState(false);

  const check = useCallback(async (url: string): Promise<boolean> => {
    setChecking(true);
    try {
      return await checkStreamAvailability(url, 3000);
    } finally {
      setChecking(false);
    }
  }, []);

  return { check, checking };
}
