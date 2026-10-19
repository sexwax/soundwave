import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { RadioStation } from '../store/radioStore';
import { Button } from '../../../shared/components/ui/Button';
import { Spinner } from '../../../shared/components/ui/Spinner';

interface Props {
  station: RadioStation;
}

function themeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function SharePanel({ station }: Props) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const hasClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
  const hasShare = typeof navigator !== 'undefined' && !!navigator.share;

  const shareUrl =
    (import.meta.env.VITE_APP_URL ?? window.location.origin) +
    '/station/' +
    station.stationuuid;

  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 180,
      margin: 2,
      color: {
        dark: themeColor('--accent-primary', '#00e5ff'),
        light: themeColor('--bg-base', '#080b12'),
      },
    })
      .then(setQrUrl)
      .catch(console.error);
  }, [shareUrl]);

  const copyLink = async () => {
    if (hasClipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      fallbackInputRef.current?.select();
    }
  };

  const shareLink = async () => {
    try {
      await navigator.share({ title: station.name, url: shareUrl });
    } catch {
      // El usuario canceló el diálogo de compartir del sistema — no hacer nada.
    }
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

      {hasClipboard ? (
        <div style={{
          fontSize: 11, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)',
          wordBreak: 'break-all', textAlign: 'center', maxWidth: 240,
        }}>
          {shareUrl}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, maxWidth: 240 }}>
          <input
            ref={fallbackInputRef}
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%', fontSize: 11, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '6px 8px',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
            Tu navegador no permite copiar automáticamente — selecciona y copia el enlace.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={copyLink} variant={copied ? 'primary' : 'outline'} size="sm">
          {copied ? '✓ Copiado' : '📋 Copiar enlace'}
        </Button>
        {hasShare && (
          <Button onClick={shareLink} variant="outline" size="sm">
            📤 Compartir…
          </Button>
        )}
      </div>
    </div>
  );
}
