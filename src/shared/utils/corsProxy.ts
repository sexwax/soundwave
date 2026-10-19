/**
 * CORS proxy helper for radio streams blocked by cross-origin restrictions.
 *
 * @example
 * // Direct HTTPS (preferred)
 * const url = 'https://stream.example.com/radio.mp3';
 *
 * // Via CORS proxy (fallback)
 * const url = proxify('https://stream.example.com/radio.mp3');
 */

const PROXY_URL = import.meta.env.VITE_CORS_PROXY_URL || '';

/**
 * Wrap a URL through the CORS proxy if configured.
 * @param url - The original stream URL
 * @param proxyBase - Proxy base URL to use instead of VITE_CORS_PROXY_URL (for testability)
 * @returns Proxied URL or original if no proxy configured
 */
export function proxify(url: string, proxyBase: string = PROXY_URL): string {
  if (!proxyBase) return url;
  return `${proxyBase}?url=${encodeURIComponent(url)}`;
}
