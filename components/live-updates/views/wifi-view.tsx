"use client"

import { Wifi } from "lucide-react"

export function WifiView() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-5xl lu-panel p-12 text-center">
        <div className="relative flex flex-col items-center">
          <div className="mb-8 rounded-3xl lu-pin-lake-surface border lu-pin-lake-border p-6">
            <Wifi className="h-20 w-20 lu-text-schedule" aria-hidden="true" />
          </div>

          <p className="lu-type-label-lg lu-text-schedule opacity-90 mb-10">Free WiFi</p>

          <div className="w-full max-w-3xl space-y-6">
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-6">
              <p className="lu-type-label lu-text-muted mb-3">Network</p>
              <p className="lu-type-credential">LWCC</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[0.04] px-8 py-6">
              <p className="lu-type-label lu-text-muted mb-3">Password</p>
              <p className="lu-type-credential">wifi4lwcc</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
