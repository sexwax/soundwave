import { describe, it, expect, afterEach } from 'vitest';
import { buildStreamAttempts } from '../modules/radio/services/radioPlayer';
import type { RadioStation } from '../modules/radio/store/radioStore';

function makeStation(overrides: Partial<RadioStation> = {}): RadioStation {
  return {
    stationuuid: 'uuid-1',
    name: 'Test FM',
    url: 'http://stream.example.com/radio',
    url_resolved: 'https://stream.example.com/radio',
    favicon: '',
    country: 'Spain',
    countrycode: 'ES',
    language: 'spanish',
    tags: 'pop',
    bitrate: 128,
    codec: 'MP3',
    votes: 0,
    clickcount: 0,
    hls: 0,
    lastcheckok: 1,
    ...overrides,
  };
}

describe('buildStreamAttempts', () => {
  afterEach(() => {
    // Restore jsdom's default (unimplemented) canPlayType after Safari-specific tests.
    delete (HTMLMediaElement.prototype as Partial<HTMLMediaElement>).canPlayType;
  });

  it('without a proxy: one cors attempt then one plain attempt, same URL', () => {
    const station = makeStation();
    const attempts = buildStreamAttempts(station, '');

    expect(attempts).toEqual([
      { url: station.url_resolved, el: 'cors', hls: false },
      { url: station.url_resolved, el: 'plain', hls: false },
    ]);
  });

  it('with a proxy: proxy URL attempted (cors, plain) before the direct URL (cors, plain)', () => {
    const station = makeStation();
    const proxyUrl = 'https://proxy.example.dev';
    const attempts = buildStreamAttempts(station, proxyUrl);

    const proxied = `${proxyUrl}?url=${encodeURIComponent(station.url_resolved)}`;
    expect(attempts).toEqual([
      { url: proxied, el: 'cors', hls: false },
      { url: proxied, el: 'plain', hls: false },
      { url: station.url_resolved, el: 'cors', hls: false },
      { url: station.url_resolved, el: 'plain', hls: false },
    ]);
  });

  it('HLS station without native HLS support: only cors attempts (hls.js needs fetch/XHR)', () => {
    const station = makeStation({ hls: 1 });
    const attempts = buildStreamAttempts(station, '');

    expect(attempts).toEqual([
      { url: station.url_resolved, el: 'cors', hls: true },
    ]);
  });

  it('HLS station with native HLS support (Safari): also attempts plain', () => {
    HTMLMediaElement.prototype.canPlayType = () => 'maybe';
    const station = makeStation({ hls: 1 });
    const attempts = buildStreamAttempts(station, '');

    expect(attempts).toEqual([
      { url: station.url_resolved, el: 'cors', hls: true },
      { url: station.url_resolved, el: 'plain', hls: true },
    ]);
  });

  it('falls back to url when url_resolved is empty', () => {
    const station = makeStation({ url_resolved: '' });
    const attempts = buildStreamAttempts(station, '');

    expect(attempts).toEqual([
      { url: station.url, el: 'cors', hls: false },
      { url: station.url, el: 'plain', hls: false },
    ]);
  });

  it('returns no attempts when neither url_resolved nor url is set', () => {
    const station = makeStation({ url_resolved: '', url: '' });
    expect(buildStreamAttempts(station, '')).toEqual([]);
  });

  it('does not duplicate candidate URLs when the proxied URL equals the direct URL', () => {
    const station = makeStation({ url_resolved: 'https://proxy.example.dev', url: 'https://proxy.example.dev' });
    // proxify() is a no-op when given an empty proxy base, so with no proxy configured
    // the candidate list must collapse to a single URL instead of listing it twice.
    const attempts = buildStreamAttempts(station, '');

    const urls = attempts.map((a) => a.url);
    expect(new Set(urls).size).toBe(1);
    expect(attempts).toHaveLength(2); // cors + plain for that single URL
  });
});
