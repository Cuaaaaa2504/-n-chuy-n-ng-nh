import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type TicketQrCodeProps = {
  value: string | number;
  qrUrl?: string;
  size?: number;
  className?: string;
  alt?: string;
};

export default function TicketQrCode({
  value,
  qrUrl,
  size = 160,
  className = '',
  alt = 'Mã QR vé xem phim',
}: TicketQrCodeProps) {
  const [backendQrFailed, setBackendQrFailed] = useState(false);
  const qrValue = String(value).trim();
  const shouldUseBackendQr = Boolean(qrUrl?.trim()) && !backendQrFailed;

  if (!qrValue && !shouldUseBackendQr) {
    return (
      <div
        role="img"
        aria-label="Không có dữ liệu để tạo mã QR"
        className={`inline-flex items-center justify-center rounded-lg border border-error/30 bg-error/10 p-3 text-center text-sm text-error ${className}`}
        style={{ width: size, minHeight: size }}
      >
        Không có dữ liệu QR
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg border border-outline-variant bg-white p-2 ${className}`}
    >
      {shouldUseBackendQr ? (
        <img
          src={qrUrl}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBackendQrFailed(true)}
          className="block object-contain"
        />
      ) : (
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="M"
          includeMargin={false}
          role="img"
          aria-label={alt}
        />
      )}
    </div>
  );
}
