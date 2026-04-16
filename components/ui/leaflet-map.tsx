"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker icons for Leaflet in Next.js
// Using orange to match the Rendezvous coral/orange primary color
const orangeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const redIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

type Registration = {
  id: number
  lastName: string
  email: string
  husbandPhone: string
  wifePhone: string
  homeCongregation: string
  fullAddress: string
  address: string
  lat: number
  lng: number
}

type MapCenter = {
  name: string
  address: string
  lat: number
  lng: number
}

type LeafletMapProps = {
  center: MapCenter
  registrations: Registration[]
  selectedId: number | null
  onSelectRegistration: (registration: Registration) => void
}

export function LeafletMap({ center, registrations, selectedId, onSelectRegistration }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  const [isMapReady, setIsMapReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 5,
      scrollWheelZoom: true,
    })

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Add center marker (Lake Williamson)
    const centerMarker = L.marker([center.lat, center.lng], { icon: redIcon })
    centerMarker.addTo(map)
    centerMarker.bindPopup(`<strong>${center.name}</strong><br/>${center.address}`)

    mapRef.current = map
    setIsMapReady(true)

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [center.lat, center.lng, center.name, center.address])

  // Update markers when registrations change
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return

    const map = mapRef.current
    const existingMarkers = markersRef.current

    // Remove markers that are no longer in registrations
    const currentIds = new Set(registrations.map((r) => r.id))
    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(marker)
        existingMarkers.delete(id)
      }
    })

    // Add or update markers
    registrations.forEach((reg) => {
      const existingMarker = existingMarkers.get(reg.id)

      if (existingMarker) {
        // Update existing marker icon if selection changed
        const icon = selectedId === reg.id ? greenIcon : orangeIcon
        existingMarker.setIcon(icon)
      } else {
        // Create new marker
        const icon = selectedId === reg.id ? greenIcon : orangeIcon
        const marker = L.marker([reg.lat, reg.lng], { icon })

        const popupContent = `
          <div style="min-width: 200px;">
            <strong>${reg.lastName} Family</strong>
            ${reg.email ? `<br/><a href="mailto:${reg.email}">${reg.email}</a>` : ""}
            ${reg.husbandPhone ? `<br/>Husband: <a href="tel:${reg.husbandPhone}">${reg.husbandPhone}</a>` : ""}
            ${reg.wifePhone ? `<br/>Wife: <a href="tel:${reg.wifePhone}">${reg.wifePhone}</a>` : ""}
            ${reg.homeCongregation ? `<br/><em>${reg.homeCongregation}</em>` : ""}
            <br/><span style="color: #666;">${reg.fullAddress || reg.address}</span>
          </div>
        `

        marker.bindPopup(popupContent)
        marker.on("click", () => {
          onSelectRegistration(reg)
        })

        marker.addTo(map)
        existingMarkers.set(reg.id, marker)
      }
    })
  }, [registrations, selectedId, isMapReady, onSelectRegistration])

  // Pan to selected marker when selectedId changes
  useEffect(() => {
    if (!mapRef.current || selectedId === null || !isMapReady) return

    const map = mapRef.current

    // Find the registration to get coordinates
    const selectedReg = registrations.find(r => r.id === selectedId)
    if (selectedReg) {
      // Fly to the selected location with animation
      map.flyTo([selectedReg.lat, selectedReg.lng], 10, {
        animate: true,
        duration: 0.8
      })
      
      // Open the popup on the marker after a short delay to let the animation complete
      setTimeout(() => {
        const marker = markersRef.current.get(selectedId)
        if (marker) {
          marker.openPopup()
        }
      }, 300)
    }
  }, [selectedId, isMapReady, registrations])

  return (
    <div
      ref={mapContainerRef}
      className="w-full"
      style={{ height: "100%", minHeight: "500px" }}
    />
  )
}
