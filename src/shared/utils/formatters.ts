export function formatDate(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function flagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map((c) => 0x1f1e0 + c.charCodeAt(0) - 65)
  );
}
