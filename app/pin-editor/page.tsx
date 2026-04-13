"use client"

import { useState, useRef, useEffect } from "react"
import { Copy, Check, RotateCcw } from "lucide-react"

// Initial locations from venue-map-data.ts
const initialLocations = [
  { id: "activities-center", name: "Activities Center (Room 207)", x: 68, y: 24, category: "meeting" },
  { id: "lakeside-dining", name: "Lakeside Dining Room", x: 51, y: 60, category: "dining" },
  { id: "bonfire", name: "Pavilions & Bonfire Site", x: 15, y: 18, category: "recreation" },
  { id: "archery", name: "Archery", x: 70, y: 8, category: "recreation" },
  { id: "human-foosball", name: "Human Foosball", x: 32, y: 18, category: "recreation" },
  { id: "gaga-ball", name: "GaGa Ball / 9 Square", x: 52, y: 12, category: "recreation" },
  { id: "disc-golf", name: "Disc Golf", x: 82, y: 12, category: "recreation" },
  { id: "rec-field", name: "Recreation Field #5", x: 42, y: 24, category: "recreation" },
  { id: "outdoor-pool", name: "Outdoor Pool", x: 14, y: 12, category: "recreation" },
  { id: "beachfront", name: "Beachfront", x: 10, y: 28, category: "recreation" },
]

const categoryColors: Record<string, string> = {
  meeting: "#ef4444",
  dining: "#f97316", 
  recreation: "#8b5cf6",
}

export default function PinEditorPage() {
  const [locations, setLocations] = useState(initialLocations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedId || !containerRef.current || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === selectedId
          ? { ...loc, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
          : loc
      )
    )
  }

  const generateCode = () => {
    return locations
      .map(
        (loc) =>
          `  { id: "${loc.id}", name: "${loc.name}", x: ${loc.x}, y: ${loc.y}, category: "${loc.category}" },`
      )
      .join("\n")
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generateCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetLocations = () => {
    setLocations(initialLocations)
    setSelectedId(null)
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Pin Position Editor</h1>
        <p className="text-neutral-400 mb-4 text-sm">
          1. Select a location from the list below. 2. Click on the map where the pin should be. 3. Copy the generated code when done.
        </p>

        <div className="grid lg:grid-cols-[1fr_350px] gap-4">
          {/* Map Area */}
          <div
            ref={containerRef}
            className="relative bg-neutral-800 rounded-lg overflow-hidden cursor-crosshair"
            onClick={handleMapClick}
          >
            <img
              ref={imageRef}
              src="/images/venue-map.jpg"
              alt="Venue Map"
              className="w-full h-auto"
              draggable={false}
            />
            {/* Pins */}
            {locations.map((location) => (
              <div
                key={location.id}
                className={`absolute -translate-x-1/2 -translate-y-full transition-all ${
                  selectedId === location.id ? "z-20 scale-125" : "z-10"
                }`}
                style={{
                  left: `${location.x}%`,
                  top: `${location.y}%`,
                }}
              >
                <div
                  className={`relative ${selectedId === location.id ? "animate-bounce" : ""}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={categoryColors[location.category]}
                    className="w-8 h-8 drop-shadow-lg"
                    style={{
                      filter: selectedId === location.id ? "drop-shadow(0 0 8px white)" : undefined,
                    }}
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {/* Label */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {location.name.length > 20 ? location.name.substring(0, 20) + "..." : location.name}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Crosshair for selected */}
            {selectedId && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <p className="bg-black/70 text-white px-3 py-1 rounded text-sm">
                  Click to place: {locations.find((l) => l.id === selectedId)?.name}
                </p>
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            {/* Location List */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Select Location to Move</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedId(selectedId === location.id ? null : location.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      selectedId === location.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-neutral-700 hover:bg-neutral-600"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: categoryColors[location.category] }}
                    />
                    <span className="flex-1 truncate">{location.name}</span>
                    <span className="text-xs opacity-70">
                      ({location.x}, {location.y})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Code */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Generated Code</h2>
                <div className="flex gap-2">
                  <button
                    onClick={resetLocations}
                    className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-md transition-colors"
                    title="Reset all positions"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={copyCode}
                    className="p-2 bg-primary hover:bg-primary/90 rounded-md transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <pre className="bg-neutral-900 p-3 rounded text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                {generateCode()}
              </pre>
            </div>

            {/* Legend */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Legend</h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  Meeting
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f97316]" />
                  Dining
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
                  Recreation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
