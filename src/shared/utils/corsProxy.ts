const PROXY_URL = import.meta.env.VITE_CORS_PROXY_URL || '';

export function proxify(url: string): string {
  if (!PROXY_URL) return url;
  return `${PROXY_URL}?url=${encodeURIComponent(url)}`;
}

export async function checkStreamAvailability(url: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    return response.ok || response.status === 200 || response.status === 206;
  } catch {
    return false;
  }
}
