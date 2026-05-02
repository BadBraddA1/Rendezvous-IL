"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: unknown) => void>
  }
}

export function OneSignalProvider() {
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return
    
    // Check if script already loaded
    if (document.querySelector('script[src*="OneSignalSDK"]')) return

    // Load OneSignal SDK
    const script = document.createElement("script")
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
    script.defer = true
    document.head.appendChild(script)

    // Initialize OneSignal
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      await OneSignal.init({
        appId: "e15c5c60-8457-4ced-a78b-156e2ef062f4",
        safari_web_id: "web.onesignal.auto.081d2360-74df-41b0-afe2-959ef72fcc8c",
        notifyButton: {
          enable: true,
          position: "bottom-left",
          offset: {
            bottom: "24px",
            left: "24px",
          },
        },
        allowLocalhostAsSecureOrigin: true,
      })
    })
  }, [])

  return null
}
