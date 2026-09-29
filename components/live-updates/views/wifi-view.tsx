"use client"

import { Wifi } from "lucide-react"

export function WifiView() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="lu-panel relative w-full max-w-5xl p-12 text-center">
        <div className="relative flex flex-col items-center">
          <div className="lu-pin-lake-surface lu-pin-lake-border mb-8 rounded-2xl border p-6">
            <Wifi className="lu-text-schedule h-20 w-20" aria-hidden="true" />
          </div>

          <p className="lu-type-label-lg lu-text-schedule mb-10 ">Free WiFi</p>

          <div className="grid w-full max-w-4xl gap-5 sm:grid-cols-2">
            <div className="lu-panel-inner px-8 py-7">
              <p className="lu-type-label lu-text-muted mb-3">Network</p>
              <p className="lu-type-credential">LWCC</p>
            </div>

            <div className="lu-panel-inner px-8 py-7">
              <p className="lu-type-label lu-text-muted mb-3">Password</p>
              <p className="lu-type-credential">wifi4lwcc</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
