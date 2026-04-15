"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MapPin, Plus, Trash2, Save, X, Move, Pencil, ArrowRight, RotateCcw, Download, Upload, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { mapLocations as defaultLocations, type MapLocation } from "@/lib/venue-map-data"

type EditorMode = "select" | "add" | "path"

interface MapPath {
  id: string
  from: string
  to: string
  color: string
  label?: string
}

const PIN_COLORS = [
  { value: "red", label: "Red", class: "text-red-500", bg: "bg-red-500" },
  { value: "orange", label: "Orange", class: "text-orange-500", bg: "bg-orange-500" },
  { value: "yellow", label: "Yellow", class: "text-yellow-500", bg: "bg-yellow-500" },
  { value: "green", label: "Green", class: "text-green-500", bg: "bg-green-500" },
  { value: "blue", label: "Blue", class: "text-blue-500", bg: "bg-blue-500" },
  { value: "purple", label: "Purple", class: "text-purple-500", bg: "bg-purple-500" },
  { value: "pink", label: "Pink", class: "text-pink-500", bg: "bg-pink-500" },
]

const CATEGORIES: MapLocation["category"][] = ["lodging", "dining", "activities", "recreation", "meeting"]

export default function MapEditorPage() {
  const [locations, setLocations] = useState<(MapLocation & { color?: string })[]>(() => 
    defaultLocations.map(loc => ({ ...loc, color: getCategoryColor(loc.category) }))
  )
  const [paths, setPaths] = useState<MapPath[]>([])
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>("select")
  const [pathStart, setPathStart] = useState<string | null>(null)
  const [showPaths, setShowPaths] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const [editForm, setEditForm] = useState<{
    name: string
    description: string
    category: MapLocation["category"]
    color: string
  } | null>(null)

  function getCategoryColor(cat: MapLocation["category"]): string {
    switch (cat) {
      case "dining": return "orange"
      case "meeting": return "red"
      case "lodging": return "blue"
      case "activities": return "green"
      case "recreation": return "purple"
      default: return "blue"
    }
  }

  const getColorClass = (color: string) => {
    return PIN_COLORS.find(c => c.value === color)?.class || "text-blue-500"
  }

  const selectedLocation = locations.find(l => l.id === selectedPin)

  useEffect(() => {
    if (selectedLocation) {
      setEditForm({
        name: selectedLocation.name,
        description: selectedLocation.description,
        category: selectedLocation.category,
        color: selectedLocation.color || getCategoryColor(selectedLocation.category),
      })
    } else {
      setEditForm(null)
    }
  }, [selectedPin, selectedLocation])

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || isDragging) return
    
    const rect = mapRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    if (mode === "add") {
      const newId = `location-${Date.now()}`
      const newLocation: MapLocation & { color?: string } = {
        id: newId,
        name: "New Location",
        description: "Click to edit",
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        category: "activities",
        color: "blue",
      }
      setLocations(prev => [...prev, newLocation])
      setSelectedPin(newId)
      setMode("select")
    } else if (mode === "select") {
      setSelectedPin(null)
    }
  }, [mode, isDragging])

  const handlePinClick = (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation()
    
    if (mode === "path") {
      if (!pathStart) {
        setPathStart(locationId)
      } else if (pathStart !== locationId) {
        // Create path
        const newPath: MapPath = {
          id: `path-${Date.now()}`,
          from: pathStart,
          to: locationId,
          color: "blue",
        }
        setPaths(prev => [...prev, newPath])
        setPathStart(null)
      }
    } else {
      setSelectedPin(locationId)
    }
  }

  const handlePinDrag = useCallback((e: React.MouseEvent, locationId: string) => {
    if (mode !== "select" || !mapRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    const rect = mapRef.current.getBoundingClientRect()
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100
      
      setLocations(prev => prev.map(loc => 
        loc.id === locationId 
          ? { ...loc, x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)), y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)) }
          : loc
      ))
    }
    
    const onMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
    
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [mode])

  const updateLocation = () => {
    if (!selectedPin || !editForm) return
    
    setLocations(prev => prev.map(loc =>
      loc.id === selectedPin
        ? { ...loc, ...editForm }
        : loc
    ))
  }

  const deleteLocation = () => {
    if (!selectedPin) return
    setLocations(prev => prev.filter(loc => loc.id !== selectedPin))
    setPaths(prev => prev.filter(p => p.from !== selectedPin && p.to !== selectedPin))
    setSelectedPin(null)
  }

  const deletePath = (pathId: string) => {
    setPaths(prev => prev.filter(p => p.id !== pathId))
  }

  const updatePathColor = (pathId: string, color: string) => {
    setPaths(prev => prev.map(p => p.id === pathId ? { ...p, color } : p))
  }

  const updatePathLabel = (pathId: string, label: string) => {
    setPaths(prev => prev.map(p => p.id === pathId ? { ...p, label } : p))
  }

  const resetToDefault = () => {
    setLocations(defaultLocations.map(loc => ({ ...loc, color: getCategoryColor(loc.category) })))
    setPaths([])
    setSelectedPin(null)
  }

  const exportData = () => {
    const data = {
      locations: locations.map(({ id, name, description, x, y, category, color }) => ({
        id, name, description, x, y, category, color
      })),
      paths,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "map-data.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.locations) setLocations(data.locations)
        if (data.paths) setPaths(data.paths)
      } catch (err) {
        console.error("Failed to import map data:", err)
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // Calculate path line coordinates
  const getPathCoords = (path: MapPath) => {
    const from = locations.find(l => l.id === path.from)
    const to = locations.find(l => l.id === path.to)
    if (!from || !to) return null
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Map Editor</h1>
          <p className="text-sm text-muted-foreground">Edit pins, colors, and paths</p>
        </div>

        <Tabs defaultValue="pins" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="pins" className="flex-1">Pins</TabsTrigger>
            <TabsTrigger value="paths" className="flex-1">Paths</TabsTrigger>
          </TabsList>

          <TabsContent value="pins" className="flex-1 overflow-auto p-4 space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={mode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => { setMode("select"); setPathStart(null) }}
                className="flex-1"
              >
                <Move className="h-4 w-4 mr-1" />
                Select
              </Button>
              <Button
                variant={mode === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => { setMode("add"); setPathStart(null) }}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Pin
              </Button>
            </div>

            {mode === "add" && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 text-sm text-center">
                  Click on the map to place a new pin
                </CardContent>
              </Card>
            )}

            {/* Selected Pin Editor */}
            {selectedPin && editForm && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Edit Pin</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedPin(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={editForm.category}
                        onValueChange={(val) => setEditForm(prev => prev ? { ...prev, category: val as MapLocation["category"] } : null)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pin Color</Label>
                      <Select
                        value={editForm.color}
                        onValueChange={(val) => setEditForm(prev => prev ? { ...prev, color: val } : null)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PIN_COLORS.map(color => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Position: {selectedLocation?.x.toFixed(1)}%, {selectedLocation?.y.toFixed(1)}%
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={updateLocation} className="flex-1">
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="destructive" onClick={deleteLocation}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pin List */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">All Pins ({locations.length})</Label>
              <div className="space-y-1 max-h-[300px] overflow-auto">
                {locations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedPin(loc.id)}
                    className={`w-full text-left p-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      selectedPin === loc.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                    }`}
                  >
                    <MapPin className={`h-4 w-4 ${getColorClass(loc.color || getCategoryColor(loc.category))}`} />
                    <span className="truncate flex-1">{loc.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-5">{loc.category}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paths" className="flex-1 overflow-auto p-4 space-y-4">
            {/* Path Mode */}
            <div className="flex gap-2">
              <Button
                variant={mode === "path" ? "default" : "outline"}
                size="sm"
                onClick={() => { setMode("path"); setSelectedPin(null) }}
                className="flex-1"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Draw Path
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaths(!showPaths)}
              >
                {showPaths ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            {mode === "path" && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 text-sm text-center">
                  {pathStart ? (
                    <>
                      <span className="font-medium">Start selected!</span>
                      <br />
                      Click another pin to create path
                      <Button variant="ghost" size="sm" className="ml-2" onClick={() => setPathStart(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    "Click a pin to start a path"
                  )}
                </CardContent>
              </Card>
            )}

            {/* Path List */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Paths ({paths.length})</Label>
              {paths.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No paths yet. Use Draw Path mode to connect locations.
                </p>
              ) : (
                <div className="space-y-2">
                  {paths.map(path => {
                    const from = locations.find(l => l.id === path.from)
                    const to = locations.find(l => l.id === path.to)
                    return (
                      <Card key={path.id} className="p-3">
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="truncate">{from?.name || "?"}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="truncate">{to?.name || "?"}</span>
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={path.color}
                            onValueChange={(val) => updatePathColor(path.id, val)}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PIN_COLORS.map(color => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${color.bg}`} />
                                    {color.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Label"
                            value={path.label || ""}
                            onChange={(e) => updatePathLabel(path.id, e.target.value)}
                            className="h-7 text-xs flex-1"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePath(path.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="p-4 border-t space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportData} className="flex-1">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <label className="flex-1">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </span>
              </Button>
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={resetToDefault} className="w-full">
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Default
          </Button>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 p-6 overflow-auto bg-muted/30">
        <div
          ref={mapRef}
          className="relative w-full max-w-5xl mx-auto cursor-crosshair"
          onClick={handleMapClick}
        >
          <img
            src="/images/venue-map.jpg"
            alt="Venue Map"
            className="w-full h-auto rounded-lg shadow-lg"
            draggable={false}
          />

          {/* SVG for paths */}
          {showPaths && paths.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {paths.map(path => {
                const coords = getPathCoords(path)
                if (!coords) return null
                const colorClass = PIN_COLORS.find(c => c.value === path.color)?.value || "blue"
                const strokeColor = colorClass === "red" ? "#ef4444" :
                  colorClass === "orange" ? "#f97316" :
                  colorClass === "yellow" ? "#eab308" :
                  colorClass === "green" ? "#22c55e" :
                  colorClass === "blue" ? "#3b82f6" :
                  colorClass === "purple" ? "#a855f7" :
                  colorClass === "pink" ? "#ec4899" : "#3b82f6"
                return (
                  <g key={path.id}>
                    <line
                      x1={`${coords.x1}%`}
                      y1={`${coords.y1}%`}
                      x2={`${coords.x2}%`}
                      y2={`${coords.y2}%`}
                      stroke={strokeColor}
                      strokeWidth="3"
                      strokeDasharray="8,4"
                      opacity="0.8"
                    />
                    {path.label && (
                      <text
                        x={`${(coords.x1 + coords.x2) / 2}%`}
                        y={`${(coords.y1 + coords.y2) / 2}%`}
                        fill={strokeColor}
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                        dy="-5"
                        className="drop-shadow-sm"
                      >
                        {path.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}

          {/* Pins */}
          {locations.map(loc => {
            const isSelected = selectedPin === loc.id
            const isPathStart = pathStart === loc.id
            const colorClass = getColorClass(loc.color || getCategoryColor(loc.category))
            
            return (
              <div
                key={loc.id}
                className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform ${
                  isSelected || isPathStart ? "z-20 scale-125" : "z-10 hover:scale-110"
                }`}
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                onClick={(e) => handlePinClick(e, loc.id)}
                onMouseDown={(e) => handlePinDrag(e, loc.id)}
              >
                <MapPin
                  className={`h-8 w-8 drop-shadow-lg ${colorClass} ${isPathStart ? "animate-pulse" : ""}`}
                  fill={isSelected || isPathStart ? "currentColor" : "white"}
                />
                {(isSelected || mode === "select") && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-background/95 rounded px-2 py-0.5 text-xs font-medium shadow border">
                    {loc.name}
                  </div>
                )}
              </div>
            )
          })}

          {/* Instructions overlay */}
          {mode === "add" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 rounded-lg px-4 py-2 shadow-lg border text-sm font-medium">
              Click anywhere on the map to add a pin
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
