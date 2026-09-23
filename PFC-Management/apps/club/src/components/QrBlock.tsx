"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Client-side QR for invite / ticket deep-links (offline-friendly). */
export function QrBlock({
  value,
  size = 180,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark: "#3d2e6b", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div style={{ textAlign: "center", margin: "12px 0" }}>
      {label ? (
        <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>
          {label}
        </div>
      ) : null}
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt="QR code"
          width={size}
          height={size}
          style={{
            borderRadius: 12,
            border: "1px solid var(--pfc-border)",
            background: "#fff",
          }}
        />
      ) : (
        <div
          className="muted"
          style={{
            width: size,
            height: size,
            margin: "0 auto",
            display: "grid",
            placeItems: "center",
            border: "1px dashed var(--pfc-border)",
            borderRadius: 12,
          }}
        >
          Đang tạo QR…
        </div>
      )}
    </div>
  );
}
