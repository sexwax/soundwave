/**
 * Minimal CORS proxy for radio streams, meant to run as a Cloudflare Worker.
 *
 * SoundWave calls it as `<worker-url>?url=<encoded-stream-url>` (see
 * VITE_CORS_PROXY_URL in .env.example / README.md "Proxy CORS"). It only
 * forwards the response body and headers with an added
 * `Access-Control-Allow-Origin: *`, with no caching — audio streams are
 * live, caching them would be wrong.
 *
 * Deploy with Wrangler: `npx wrangler deploy proxy/cloudflare-worker.js`
 */

export default {
  async fetch(request) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');

    if (!target) {
      return new Response('Missing "url" query parameter', { status: 400 });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response('Invalid "url" parameter', { status: 400 });
    }

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return new Response('Only http/https URLs are allowed', { status: 400 });
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl.toString(), {
        headers: { 'User-Agent': 'SoundWave-CORS-Proxy' },
        cf: { cacheTtl: 0, cacheEverything: false },
      });
    } catch {
      return new Response('Could not reach the target URL', { status: 502 });
    }

    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
