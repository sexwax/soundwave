/**
 * CORS proxy for radio streams, meant to run as a Cloudflare Worker.
 *
 * SoundWave calls it as `<worker-url>?url=<encoded-stream-url>` (see
 * VITE_CORS_PROXY_URL in .env.example / README.md "Proxy CORS"). It only
 * forwards GET/HEAD requests from an allow-listed Origin, to an allow-listed
 * content type, with no caching — audio streams are live, caching them
 * would be wrong.
 *
 * Configure the allowed origins via the `ALLOWED_ORIGINS` Worker variable
 * (comma-separated, no spaces needed), e.g.:
 *   ALLOWED_ORIGINS="https://soundwave.example.com,http://localhost:5173"
 *
 * Deploy with Wrangler: `npx wrangler deploy` (see proxy/wrangler.toml).
 */

const ALLOWED_CONTENT_TYPE_PREFIXES = [
  'audio/',
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'video/mp2t',
  'application/octet-stream',
];

function getAllowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Plain <audio> requests without `crossOrigin` (SoundWave's `plainEl` in
 * radioPlayer) are "no-CORS": the browser never sends an `Origin` header for
 * them, so checking `Origin` alone would 403 every one of them. Fall back to
 * the `Referer`'s origin in that case — still a real (if spoofable) signal
 * of where the request came from, which is all this allow-list needs.
 */
function resolveClientOrigin(request) {
  const originHeader = request.headers.get('Origin');
  if (originHeader) return originHeader;

  const referer = request.headers.get('Referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isOriginAllowed(origin, env) {
  return !!origin && getAllowedOrigins(env).includes(origin);
}

/** Only a request that actually sent `Origin` needs ACAO/Vary back — a no-CORS request reads neither. */
function corsHeaders(originHeader) {
  const headers = new Headers();
  if (originHeader) {
    headers.set('Access-Control-Allow-Origin', originHeader);
    headers.set('Vary', 'Origin');
  }
  return headers;
}

/** Blocks proxying to private/loopback hosts (SSRF guard — this is a public proxy). */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 literal brackets, if any
  if (h === 'localhost' || h === '::1') return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

export default {
  async fetch(request, env) {
    const originHeader = request.headers.get('Origin');
    const effectiveOrigin = resolveClientOrigin(request);
    const allowed = isOriginAllowed(effectiveOrigin, env);

    if (request.method === 'OPTIONS') {
      if (!allowed) return new Response(null, { status: 403 });
      const headers = corsHeaders(originHeader);
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD, OPTIONS' },
      });
    }

    if (!allowed) {
      return new Response('Origin not allowed', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');
    if (!target) {
      return new Response('Missing "url" query parameter', { status: 400, headers: corsHeaders(originHeader) });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response('Invalid "url" parameter', { status: 400, headers: corsHeaders(originHeader) });
    }

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return new Response('Only http/https URLs are allowed', { status: 400, headers: corsHeaders(originHeader) });
    }

    if (isPrivateHost(targetUrl.hostname)) {
      return new Response('Target host not allowed', { status: 400, headers: corsHeaders(originHeader) });
    }

    let upstream;
    try {
      upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: { 'User-Agent': 'SoundWave-CORS-Proxy' },
        cf: { cacheTtl: 0, cacheEverything: false },
      });
    } catch {
      return new Response('Could not reach the target URL', { status: 502, headers: corsHeaders(originHeader) });
    }

    const contentType = (upstream.headers.get('Content-Type') || '').toLowerCase();
    const contentTypeAllowed = ALLOWED_CONTENT_TYPE_PREFIXES.some((prefix) => contentType.startsWith(prefix));
    if (!contentTypeAllowed) {
      return new Response('Unsupported content type', { status: 415, headers: corsHeaders(originHeader) });
    }

    const headers = new Headers(upstream.headers);
    headers.delete('Set-Cookie');
    if (originHeader) {
      headers.set('Access-Control-Allow-Origin', originHeader);
      headers.set('Vary', 'Origin');
    }
    headers.set('Cache-Control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
