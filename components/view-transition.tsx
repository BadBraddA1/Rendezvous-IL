"use client"

import { type ReactNode } from "react"

/** Subtle crossfade for live-updates view rotation — no blur, flip, or glitch. */
export function ViewTransition({
  viewKey,
  children,
  className = "",
}: {
  viewKey: string
  children: ReactNode
  className?: string
}) {
  return (
    <>
      <style jsx global>{`
        @keyframes vt-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .vt-fade {
          animation: vt-fade 320ms var(--ease-out-quart, cubic-bezier(0.25, 1, 0.5, 1)) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .vt-fade {
            animation: none !important;
          }
        }
      `}</style>
      <div key={viewKey} className={`vt-fade ${className}`}>
        {children}
      </div>
    </>
  )
}
