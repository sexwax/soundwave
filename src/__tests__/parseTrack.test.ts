import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTrack } from '../modules/player/hooks/useLocalFiles';

function loadFixture(): File {
  const buf = readFileSync(join(__dirname, 'fixtures', 'sample.mp3'));
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return new File([bytes], 'sample.mp3', { type: 'audio/mpeg' });
}

describe('parseTrack', () => {
  it('extracts title, artist, duration and coverUrl from ID3 tags', async () => {
    const file = loadFixture();

    const track = await parseTrack(file, 'sample.mp3');

    expect(track.title).toBe('Fixture Title');
    expect(track.artist).toBe('Fixture Artist');
    expect(track.album).toBe('Fixture Album');
    expect(track.duration).toBeGreaterThan(0);
    expect(track.coverUrl).toBeTruthy();
  });
});
