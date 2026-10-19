import type { RadioStation } from '../store/radioStore';

const FALLBACK_BASE = 'https://de1.api.radio-browser.info/json';
const DISCOVERY_URL = 'https://all.api.radio-browser.info/json/servers';

export interface SearchParams {
  name?: string;
  country?: string;
  language?: string;
  tags?: string;
  bitrateMin?: number;
  codec?: string;
  hidebroken?: boolean;
  order?: string;
  reverse?: boolean;
  offset?: number;
  limit?: number;
}

export interface VoteResult {
  ok: boolean;
  message: string;
}

interface ServerInfo {
  name: string;
}

let cachedBase: string | null = null;

async function resolveBase(): Promise<string> {
  if (cachedBase) return cachedBase;
  try {
    const res = await fetch(DISCOVERY_URL);
    if (!res.ok) throw new Error('discovery failed');
    const servers: ServerInfo[] = await res.json();
    if (!servers.length) throw new Error('empty server list');
    const pick = servers[Math.floor(Math.random() * servers.length)];
    cachedBase = `https://${pick.name}/json`;
  } catch {
    cachedBase = FALLBACK_BASE;
  }
  return cachedBase;
}

async function apiFetch<T>(path: string): Promise<T> {
  const base = await resolveBase();
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`Radio Browser API error: ${res.status}`);
  return res.json();
}

async function apiFetchWithRetry<T>(path: string): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch {
    cachedBase = null; // fuerza redescubrimiento en retry
    return apiFetch<T>(path);
  }
}

export const radioBrowserApi = {
  search: (params: SearchParams = {}): Promise<RadioStation[]> => {
    const q = new URLSearchParams({
      hidebroken: String(params.hidebroken ?? true),
      order: params.order ?? 'votes',
      reverse: String(params.reverse ?? true),
      offset: String(params.offset ?? 0),
      limit: String(params.limit ?? 50),
      ...(params.name && { name: params.name }),
      ...(params.country && { country: params.country }),
      ...(params.language && { language: params.language }),
      ...(params.tags && { tags: params.tags }),
      ...(params.bitrateMin && { bitrateMin: String(params.bitrateMin) }),
      ...(params.codec && { codec: params.codec }),
    });
    return apiFetchWithRetry<RadioStation[]>(`/stations/search?${q}`);
  },
  topVote: (limit = 100): Promise<RadioStation[]> => apiFetchWithRetry<RadioStation[]>(`/stations/topvote/${limit}`),
  byUuid: (uuid: string): Promise<RadioStation[]> =>
    apiFetchWithRetry<RadioStation[]>(`/stations/byuuid?uuids=${encodeURIComponent(uuid)}`),
  countries: () => apiFetchWithRetry('/countries'),
  tags: (limit = 100) => apiFetchWithRetry(`/tags?order=stationcount&reverse=true&limit=${limit}`),
  registerClick: (uuid: string) => apiFetchWithRetry(`/url/${uuid}`).catch(() => null),
  vote: (uuid: string): Promise<VoteResult> => apiFetchWithRetry<VoteResult>(`/vote/${uuid}`),
};
