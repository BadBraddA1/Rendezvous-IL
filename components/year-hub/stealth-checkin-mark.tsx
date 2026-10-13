"use client"

/**
 * Stealth check-in mark — Walmart Digimarc spirit, standard QR under the hood.
 * Quiet lake-teal watermark on Home; double-tap to brighten for the desk scanner.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react"

/** Matches `--checkin-qr-ink` / `--foreground` sRGB for the qrcode canvas API. */
const QR_INK_FALLBACK = "#022020"

function resolveQrInk(): string {
  if (typeof window === "undefined") return QR_INK_FALLBACK
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--checkin-qr-ink")
    .trim()
  return raw || QR_INK_FALLBACK
}

export function StealthCheckInMark({
  code,
  familyLastName,
}: {
  code: string
  familyLastName?: string | null
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [bright, setBright] = useState(false)
  const lastTap = useRef(0)
  const dimTimer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    setDataUrl(null)

    // Lazy-load qrcode so guest/home bundles never pay for it
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(code, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 280,
          color: {
            dark: resolveQrInk(),
            light: "#00000000",
          },
        }),
      )
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      if (dimTimer.current != null) window.clearTimeout(dimTimer.current)
    }
  }, [code])

  const toggleBright = () => {
    if (dimTimer.current != null) {
      window.clearTimeout(dimTimer.current)
      dimTimer.current = null
    }
    setBright((prev) => {
      const next = !prev
      if (next) {
        dimTimer.current = window.setTimeout(() => {
          setBright(false)
          dimTimer.current = null
        }, 12_000)
      }
      return next
    })
  }

  const onPointerUp = () => {
    const now = Date.now()
    if (now - lastTap.current < 320) {
      toggleBright()
      lastTap.current = 0
    } else {
      lastTap.current = now
    }
  }

  const onPointerCancel = () => {
    lastTap.current = 0
  }

  const title = familyLastName?.trim()
    ? `${familyLastName.trim()} family`
    : "Your check-in mark"

  const shellProps = {
    className:
      "focus-ring relative overflow-hidden rounded-2xl border border-primary/20 bg-surface-highlight p-4 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    onPointerUp,
    onPointerCancel,
    role: "button" as const,
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        toggleBright()
      }
    },
    "aria-label": bright
      ? "Check-in mark bright — press Enter to dim"
      : "Check-in watermark — double-tap or press Enter to brighten for staff scan",
    "aria-pressed": bright,
  }

  if (failed) {
    return (
      <section
        className="rounded-2xl border border-warning/40 bg-surface-warm p-4"
        aria-label="Check-in code"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface">Desk scan</p>
        <p className="mt-1 text-sm font-medium text-balance break-words text-foreground">{title}</p>
        <p className="mt-2 font-mono text-sm tracking-wide break-all text-foreground">{code}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          QR couldn’t load — show this code at the desk.
        </p>
      </section>
    )
  }

  if (!dataUrl) {
    return (
      <section
        className="rounded-2xl border border-primary/20 bg-surface-highlight p-4"
        aria-busy="true"
        aria-label="Loading check-in mark"
      >
        <div className="flex items-center gap-4">
          <div className="size-28 shrink-0 animate-pulse rounded-xl bg-primary/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-primary/10" />
            <div className="h-4 w-40 max-w-full animate-pulse rounded bg-primary/10" />
            <div className="h-3 w-56 max-w-full animate-pulse rounded bg-primary/10" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section {...shellProps}>
      <div className="relative flex items-center gap-4">
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl transition-[opacity,filter] duration-200 ${
            bright ? "bg-card p-2 opacity-100" : "bg-transparent p-1 opacity-[0.28]"
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
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface">Desk scan</p>
          <p className="text-sm font-medium text-balance break-words text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground text-pretty">
            Staff can scan this Home screen. Double-tap to brighten.
          </p>
        </div>
      </div>
    </section>
  )
}
