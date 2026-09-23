"use client"

/**
 * Stealth check-in mark — Walmart Digimarc spirit, standard QR under the hood.
 * Quiet lake-teal watermark on Home; hold/tap to brighten for the desk scanner.
 */

import { useEffect, useState } from "react"
import QRCode from "qrcode"

export function StealthCheckInMark({
  code,
  familyLastName,
}: {
  code: string
  familyLastName?: string | null
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [bright, setBright] = useState(false)

  useEffect(() => {
    let cancelled = false
    void QRCode.toDataURL(code, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 280,
      color: {
        dark: "#0B3D4A",
        light: "#00000000",
      },
    }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [code])

  if (!dataUrl) return null

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-surface-highlight p-4"
      onPointerDown={() => setBright(true)}
      onPointerUp={() => setBright(false)}
      onPointerLeave={() => setBright(false)}
      onPointerCancel={() => setBright(false)}
      aria-label="Check-in watermark — hold to brighten for staff scan"
    >
      {/* Soft geometric “wallpaper” so the QR feels woven into the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 22%, color-mix(in oklch, var(--primary) 28%, transparent) 0 1px, transparent 1.5px), radial-gradient(circle at 72% 68%, color-mix(in oklch, var(--primary) 22%, transparent) 0 1px, transparent 1.5px)",
          backgroundSize: "14px 14px, 18px 18px",
        }}
      />

      <div className="relative flex items-center gap-4">
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl transition-[opacity,filter] duration-200 ${
            bright ? "bg-white p-2 opacity-100" : "bg-transparent p-1 opacity-[0.28]"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt=""
            width={112}
            height={112}
            className="size-28 select-none"
            draggable={false}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
            Desk scan
          </p>
          <p className="text-sm font-medium text-balance">
            {familyLastName ? `${familyLastName} family` : "Your check-in mark"}
          </p>
          <p className="text-xs text-muted-foreground">
            Staff can scan this Home screen. Hold to brighten.
          </p>
        </div>
      </div>
    </section>
  )
}
