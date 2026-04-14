/**
 * CORS Proxy utilities for blocked radio streams
 *
 * Usage:
 * - For HTTPS streams: try direct first, fallback to proxy
 * - For HTTP streams: always use proxy or allorigins
 *
 * @example
 * // Direct HTTPS (preferred)
 * const url = 'https://stream.example.com/radio.mp3';
 *
 * // Via CORS proxy (fallback)
 * const url = proxify('https://stream.example.com/radio.mp3');
 *
 * // For HTTP-only resources (fallback)
 * const url = `https://api.allorigins.win/raw?url=${encodeURIComponent('http://example.com/stream')}`;
 */

const PROXY_URL = import.meta.env.VITE_CORS_PROXY_URL || '';

/**
 * Wrap a URL through the CORS proxy if configured
 * @param url - The original stream URL
 * @returns Proxied URL or original if no proxy configured
 */
export function proxify(url: string): string {
  if (!PROXY_URL) return url;
  return `${PROXY_URL}?url=${encodeURIComponent(url)}`;
}

/**
 * Fallback proxy for HTTP-only resources using AllOrigins
 * Use this when the stream doesn't support HTTPS and CORS proxy is not available
 *
 * @param url - HTTP URL to proxy
 * @returns AllOrigins proxied URL
 */
export function proxyHttp(url: string): string {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}
