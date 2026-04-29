"use client"

import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"

// Lake Williamson coordinates
const LAT = 39.2795
const LON = -89.8820

export function WeatherRadar() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch API key from our backend
  useEffect(() => {
    fetch("/api/weather/key")
      .then((res) => res.json())
      .then((data) => {
        if (data.key) setApiKey(data.key)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !apiKey) return
    if (typeof window === "undefined") return

    // Dynamically import Leaflet only on client
    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return

      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [LAT, LON],
        zoom: 7,
        zoomControl: true,
      })
      mapRef.current = map

      // Add base tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      // Add OpenWeatherMap precipitation layer
      L.tileLayer(
        `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        {
          attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
          opacity: 0.7,
          maxZoom: 18,
        }
      ).addTo(map)

      // Custom marker icon to avoid default icon issues
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      // Add marker for Lake Williamson
      const marker = L.marker([LAT, LON], { icon: customIcon })
      marker.addTo(map)
      marker.bindPopup("<strong>Lake Williamson</strong><br/>Christian Center")
    })

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [apiKey])

  if (loading) {
    return (
      <div className="aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading radar...</div>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Radar unavailable</div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainerRef}
      className="aspect-video rounded-lg overflow-hidden"
      style={{ minHeight: "300px" }}
    />
  )
}
