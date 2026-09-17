"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface JoinQRCodeProps {
  url: string;
  size?: number;
}

export function JoinQRCode({ url, size = 140 }: JoinQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: "#065F46", light: "#FFFFFF" },
    })
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        className="rounded-2xl bg-white/60 animate-pulse"
        style={{ width: size, height: size }}
        aria-label="Generating QR code"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code to join at ${url}`}
      width={size}
      height={size}
      className="rounded-2xl bg-white p-2"
    />
  );
}
