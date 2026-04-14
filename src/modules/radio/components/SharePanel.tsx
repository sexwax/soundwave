import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { RadioStation } from '../store/radioStore';
import { Button } from '../../../shared/components/ui/Button';
import { Spinner } from '../../../shared/components/ui/Spinner';

interface Props {
  station: RadioStation;
}

export function SharePanel({ station }: Props) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const shareUrl =
    (import.meta.env.VITE_APP_URL ?? window.location.origin) +
    '/station/' +
    station.stationuuid;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 180, margin: 2, color: { dark: '#00e5ff', light: '#080b12' } })
      .then(setQrUrl)
      .catch(console.error);
  }, [shareUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        {station.name}
      </div>

      {qrUrl ? (
        <img src={qrUrl} alt="QR" style={{ borderRadius: 8, width: 180, height: 180 }} />
      ) : (
        <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={32} />
        </div>
      )}

      <div style={{
        fontSize: 11, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)',
        wordBreak: 'break-all', textAlign: 'center', maxWidth: 240,
      }}>
        {shareUrl}
      </div>

      <Button onClick={copyLink} variant={copied ? 'primary' : 'outline'} size="sm">
        {copied ? '✓ Copiado' : '📋 Copiar enlace'}
      </Button>
    </div>
  );
}
