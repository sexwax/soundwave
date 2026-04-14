import { useCallback, useState } from 'react';
import { radioBrowserApi, type SearchParams } from '../services/radioBrowserApi';
import { useRadioStore, type RadioStation } from '../store/radioStore';

export function useRadioBrowser() {
  const { setStations, setIsLoading } = useRadioStore();
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await radioBrowserApi.search(params) as RadioStation[];
      setStations(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [setStations, setIsLoading]);

  const loadTopStations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await radioBrowserApi.topVote(100) as RadioStation[];
      setStations(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [setStations, setIsLoading]);

  return { search, loadTopStations, error };
}
