"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { MapPin, Plus, Trash2, Save, X, Move, ArrowRight, RotateCcw, Download, Upload, Eye, EyeOff, Check, CircleDot, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { mapLocations as defaultLocations, type MapLocation } from "@/lib/venue-map-data"

type EditorMode = "select" | "add" | "path"

interface PathPoint {
  x: number
  y: number
  isWaypoint?: boolean // true for waypoints, false/undefined for pin connections
  pinId?: string // if connected to a pin
}

interface MapPath {
  id: string
  points: PathPoint[]
  color: string
  label?: string
}

const PIN_COLORS = [
  { value: "red", label: "Red", class: "text-red-500", bg: "bg-red-500", hex: "#ef4444" },
  { value: "orange", label: "Orange", class: "text-orange-500", bg: "bg-orange-500", hex: "#f97316" },
  { value: "yellow", label: "Yellow", class: "text-yellow-500", bg: "bg-yellow-500", hex: "#eab308" },
  { value: "green", label: "Green", class: "text-green-500", bg: "bg-green-500", hex: "#22c55e" },
  { value: "blue", label: "Blue", class: "text-blue-500", bg: "bg-blue-500", hex: "#3b82f6" },
  { value: "purple", label: "Purple", class: "text-purple-500", bg: "bg-purple-500", hex: "#a855f7" },
  { value: "pink", label: "Pink", class: "text-pink-500", bg: "bg-pink-500", hex: "#ec4899" },
]

const CATEGORIES: MapLocation["category"][] = ["lodging", "dining", "activities", "recreation", "meeting"]

export default function MapEditorPage() {
  const [locations, setLocations] = useState<(MapLocation & { color?: string })[]>(() => 
    defaultLocations.map(loc => ({ ...loc, color: getCategoryColor(loc.category) }))
  )
  const [paths, setPaths] = useState<MapPath[]>([])
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const [mode, setMode] = useState<EditorMode>("select")
  const [currentPath, setCurrentPath] = useState<PathPoint[]>([])
  const [isDrawingPath, setIsDrawingPath] = useState(false)
  const [showPaths, setShowPaths] = useState(true)
  const [showExportCode, setShowExportCode] = useState(false)
  const [exportCode, setExportCode] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)
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

  const getColorHex = (color: string) => {
    return PIN_COLORS.find(c => c.value === color)?.hex || "#3b82f6"
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
    } else if (mode === "path" && isDrawingPath) {
      // Add waypoint to current path
      setCurrentPath(prev => [...prev, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, isWaypoint: true }])
    } else if (mode === "select") {
      setSelectedPin(null)
      setSelectedPathId(null)
    }
  }, [mode, isDragging, isDrawingPath])

  const handlePinClick = (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation()
    
    if (mode === "path") {
      const loc = locations.find(l => l.id === locationId)
      if (!loc) return

      if (!isDrawingPath) {
        // Start a new path from this pin
        setCurrentPath([{ x: loc.x, y: loc.y, pinId: locationId }])
        setIsDrawingPath(true)
      } else {
        // End path at this pin
        const newPath: MapPath = {
          id: `path-${Date.now()}`,
          points: [...currentPath, { x: loc.x, y: loc.y, pinId: locationId }],
          color: "blue",
        }
        setPaths(prev => [...prev, newPath])
        setCurrentPath([])
        setIsDrawingPath(false)
      }
    } else {
      setSelectedPin(locationId)
      setSelectedPathId(null)
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

      // Update any paths that reference this pin
      setPaths(prev => prev.map(path => ({
        ...path,
        points: path.points.map(point => 
          point.pinId === locationId 
            ? { ...point, x: Math.max(0, Math.min(100, Math.round(x * 10) / 10)), y: Math.max(0, Math.min(100, Math.round(y * 10) / 10)) }
            : point
        )
      })))
    }
    
    const onMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
    
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [mode])

  const cancelPath = () => {
    setCurrentPath([])
    setIsDrawingPath(false)
  }

  const undoLastPoint = () => {
    if (currentPath.length > 1) {
      setCurrentPath(prev => prev.slice(0, -1))
    }
  }

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
    setPaths(prev => prev.filter(p => !p.points.some(pt => pt.pinId === selectedPin)))
    setSelectedPin(null)
  }

  const deletePath = (pathId: string) => {
    setPaths(prev => prev.filter(p => p.id !== pathId))
    if (selectedPathId === pathId) setSelectedPathId(null)
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
    setCurrentPath([])
    setIsDrawingPath(false)
  }

  const exportData = () => {
    const data = {
      locations: locations.map(({ id, name, description, x, y, category, color }) => ({
        id, name, description, x, y, category, color
      })),
      paths,
    }
    const jsonString = JSON.stringify(data, null, 2)
    setExportCode(jsonString)
    setShowExportCode(true)
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

  // Generate SVG path string from points
  const getPathD = (points: PathPoint[]) => {
    if (points.length < 2) return ""
    return points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x}% ${point.y}%`
    ).join(' ')
  }

  // Get path label position (midpoint)
  const getPathLabelPosition = (points: PathPoint[]) => {
    if (points.length < 2) return { x: 0, y: 0 }
    const midIndex = Math.floor(points.length / 2)
    return { x: points[midIndex].x, y: points[midIndex].y }
  }

  const getStartEndPins = (path: MapPath) => {
    const startPin = path.points[0]?.pinId ? locations.find(l => l.id === path.points[0].pinId) : null
    const endPin = path.points[path.points.length - 1]?.pinId ? locations.find(l => l.id === path.points[path.points.length - 1].pinId) : null
    return { startPin, endPin }
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
                onClick={() => { setMode("select"); cancelPath() }}
                className="flex-1"
              >
                <Move className="h-4 w-4 mr-1" />
                Select
              </Button>
              <Button
                variant={mode === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => { setMode("add"); cancelPath() }}
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
                <CardContent className="p-3 text-sm space-y-2">
                  {!isDrawingPath ? (
                    <div className="text-center">
                      <p className="font-medium">Click a pin to start drawing</p>
                      <p className="text-xs text-muted-foreground mt-1">Your path will begin from that location</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="font-medium">Drawing path ({currentPath.length} points)</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Click on the map to add waypoints, or click a pin to end the path
                        </p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="outline" onClick={undoLastPoint} disabled={currentPath.length <= 1}>
                          Undo Point
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelPath}>
                          Cancel
                        </Button>
                      </div>
                    </>
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
                    const { startPin, endPin } = getStartEndPins(path)
                    const waypointCount = path.points.filter(p => p.isWaypoint).length
                    return (
                      <Card 
                        key={path.id} 
                        className={`p-3 cursor-pointer transition-colors ${selectedPathId === path.id ? "border-primary" : ""}`}
                        onClick={() => setSelectedPathId(path.id)}
                      >
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="truncate">{startPin?.name || "?"}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="truncate">{endPin?.name || "?"}</span>
                          {waypointCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                              {waypointCount} waypoint{waypointCount > 1 ? "s" : ""}
                            </Badge>
                          )}
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
                            onClick={(e) => e.stopPropagation()}
                            className="h-7 text-xs flex-1"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deletePath(path.id) }}>
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

          {/* Export Code Panel */}
          {showExportCode && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Export Code</span>
                <Button variant="ghost" size="sm" onClick={() => setShowExportCode(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <textarea
                readOnly
                value={exportCode}
                className="w-full h-48 p-2 text-xs font-mono bg-muted border rounded resize-none"
              />
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(exportCode)
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy to Clipboard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 p-6 overflow-auto bg-muted/30">
        <div
          ref={mapRef}
          className={`relative w-full max-w-5xl mx-auto ${mode === "add" || (mode === "path" && isDrawingPath) ? "cursor-crosshair" : "cursor-default"}`}
          onClick={handleMapClick}
        >
          <img
            src="/images/venue-map.jpg"
            alt="Venue Map"
            className="w-full h-auto rounded-lg shadow-lg"
            draggable={false}
          />

          {/* SVG for paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Existing paths */}
            {showPaths && paths.map(path => {
              const strokeColor = getColorHex(path.color)
              const isSelected = selectedPathId === path.id
              const labelPos = getPathLabelPosition(path.points)
              return (
                <g key={path.id}>
                  <path
                    d={getPathD(path.points)}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? "5" : "3"}
                    strokeDasharray="8,4"
                    fill="none"
                    opacity={isSelected ? "1" : "0.7"}
                  />
                  {/* Waypoint dots */}
                  {path.points.map((point, i) => (
                    point.isWaypoint && (
                      <circle
                        key={i}
                        cx={`${point.x}%`}
                        cy={`${point.y}%`}
                        r={isSelected ? "6" : "4"}
                        fill={strokeColor}
                        opacity={isSelected ? "1" : "0.7"}
                      />
                    )
                  ))}
                  {/* Path label */}
                  {path.label && (
                    <text
                      x={`${labelPos.x}%`}
                      y={`${labelPos.y}%`}
                      fill={strokeColor}
                      fontSize="12"
                      fontWeight="600"
                      textAnchor="middle"
                      dy="-8"
                      className="drop-shadow-sm"
                      style={{ textShadow: "0 0 3px white, 0 0 3px white" }}
                    >
                      {path.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Current path being drawn */}
            {isDrawingPath && currentPath.length > 0 && (
              <g>
                <path
                  d={getPathD(currentPath)}
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray="4,4"
                  fill="none"
                  opacity="0.8"
                />
                {currentPath.map((point, i) => (
                  <circle
                    key={i}
                    cx={`${point.x}%`}
                    cy={`${point.y}%`}
                    r={point.isWaypoint ? "5" : "7"}
                    fill={point.isWaypoint ? "#3b82f6" : "#22c55e"}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>

          {/* Pins */}
          {locations.map(loc => {
            const isSelected = selectedPin === loc.id
            const isPathPoint = mode === "path" && currentPath.some(p => p.pinId === loc.id)
            const colorClass = getColorClass(loc.color || getCategoryColor(loc.category))
            
            return (
              <div
                key={loc.id}
                className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform ${
                  isSelected || isPathPoint ? "z-20 scale-125" : "z-10 hover:scale-110"
                }`}
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                onClick={(e) => handlePinClick(e, loc.id)}
                onMouseDown={(e) => handlePinDrag(e, loc.id)}
              >
                <MapPin
                  className={`h-8 w-8 drop-shadow-lg ${colorClass} ${isPathPoint ? "animate-pulse" : ""}`}
                  fill={isSelected || isPathPoint ? "currentColor" : "white"}
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
          {mode === "path" && isDrawingPath && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/95 rounded-lg px-4 py-2 shadow-lg border text-sm font-medium">
              Click to add waypoints, or click a pin to finish
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
