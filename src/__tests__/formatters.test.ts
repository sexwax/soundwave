import { describe, it, expect } from 'vitest';
import { formatTime, flagEmoji } from '../shared/utils/formatters';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [NaN, '0:00'],
    [Infinity, '0:00'],
    [59, '0:59'],
    [61, '1:01'],
    [3600, '60:00'],
  ])('formatTime(%s) -> %s', (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });
});

describe('flagEmoji', () => {
  it('returns the matching flag for a valid ISO country code', () => {
    expect(flagEmoji('ES')).toBe('🇪🇸');
    expect(flagEmoji('us')).toBe('🇺🇸'); // lowercase input is normalized
  });

  it('falls back to 🌐 for an empty or invalid code', () => {
    expect(flagEmoji('')).toBe('🌐');
    expect(flagEmoji('ESP')).toBe('🌐'); // not exactly 2 chars
  });
});
