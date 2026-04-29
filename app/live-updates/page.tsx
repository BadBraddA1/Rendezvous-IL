"use client"

import { useEffect, useState, useCallback } from "react"
import { NowNextSchedule } from "@/components/now-next-schedule"
import { WeatherForecast } from "@/components/weather-forecast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Maximize2, 
  Minimize2, 
  Calendar, 
  Cloud, 
  Megaphone, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react"
import Image from "next/image"

interface Announcement {
  id: number
  title: string
  message: string
  priority: string
  is_active: boolean
  show_on_live_updates: boolean
  created_at: string
  expires_at: string | null
}

const TABS = ["schedule", "weather", "announcements"] as const
type TabType = typeof TABS[number]

export default function LiveUpdatesPage() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("schedule")
  const [isRotating, setIsRotating] = useState(false)
  const [showTabs, setShowTabs] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch("/api/announcements")
      const data = await res.json()
      if (data.announcements) {
        setAnnouncements(data.announcements)
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error)
    } finally {
      setAnnouncementsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
    // Refresh announcements every minute
    const interval = setInterval(fetchAnnouncements, 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAnnouncements])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Handle fullscreen change from escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Navigate to next/previous tab
  const goToNextTab = useCallback(() => {
    const currentIndex = TABS.indexOf(activeTab)
    const nextIndex = (currentIndex + 1) % TABS.length
    setActiveTab(TABS[nextIndex])
  }, [activeTab])

  const goToPrevTab = useCallback(() => {
    const currentIndex = TABS.indexOf(activeTab)
    const prevIndex = (currentIndex - 1 + TABS.length) % TABS.length
    setActiveTab(TABS[prevIndex])
  }, [activeTab])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "f":
        case "F":
          toggleFullscreen()
          break
        case "ArrowRight":
        case "n":
        case "N":
          goToNextTab()
          break
        case "ArrowLeft":
        case "p":
        case "P":
          goToPrevTab()
          break
        case "r":
        case "R":
          setIsRotating((prev) => !prev)
          break
        case "h":
        case "H":
          setShowTabs((prev) => !prev)
          break
        case "1":
          setActiveTab("schedule")
          break
        case "2":
          setActiveTab("weather")
          break
        case "3":
          setActiveTab("announcements")
          break
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleFullscreen, goToNextTab, goToPrevTab, isFullscreen])

  // Auto-rotate tabs
  useEffect(() => {
    if (!isRotating) return

    const interval = setInterval(() => {
      goToNextTab()
    }, 10000) // Rotate every 10 seconds

    return () => clearInterval(interval)
  }, [isRotating, goToNextTab])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300"
      case "high":
        return "bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300"
      case "normal":
        return "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300"
      case "low":
        return "bg-gray-500/20 border-gray-500 text-gray-700 dark:text-gray-300"
      default:
        return "bg-blue-500/20 border-blue-500"
    }
  }

  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? "p-8" : "p-4 md:p-8"}`}>
      {/* Header */}
      <header className={`flex items-center justify-between mb-6 ${isFullscreen && !showTabs ? "opacity-0 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-4">
          <Image
            src="/rendezvous-logo.png"
            alt="Rendezvous"
            width={150}
            height={50}
            className="h-10 w-auto"
          />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Live Updates</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTabs(!showTabs)}
            className="hidden md:flex items-center gap-2"
          >
            {showTabs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="sr-only md:not-sr-only">{showTabs ? "Hide" : "Show"} Controls</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRotating(!isRotating)}
            className="flex items-center gap-2"
          >
            {isRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="sr-only md:not-sr-only">{isRotating ? "Stop" : "Auto"} Rotate</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevTab}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextTab}
            className="flex items-center"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="flex items-center gap-2"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="sr-only md:not-sr-only">{isFullscreen ? "Exit" : "Enter"} Fullscreen</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
        <TabsList className={`grid w-full grid-cols-3 mb-6 ${isFullscreen && !showTabs ? "opacity-0 pointer-events-none" : ""}`}>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span>Weather</span>
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2 relative">
            <Megaphone className="h-4 w-4" />
            <span>Announcements</span>
            {announcements.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {announcements.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-0">
          <div className={`${isFullscreen ? "max-w-4xl mx-auto" : ""}`}>
            <NowNextSchedule />
          </div>
        </TabsContent>

        <TabsContent value="weather" className="mt-0">
          <div className={`${isFullscreen ? "max-w-4xl mx-auto" : ""}`}>
            <WeatherForecast />
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="mt-0">
          <div className={`${isFullscreen ? "max-w-4xl mx-auto" : ""} space-y-4`}>
            {announcementsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-muted-foreground">Loading announcements...</div>
                </CardContent>
              </Card>
            ) : announcements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Announcements</h3>
                  <p className="text-muted-foreground">Check back later for updates.</p>
                </CardContent>
              </Card>
            ) : (
              announcements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={`border-l-4 ${getPriorityColor(announcement.priority)}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {announcement.priority === "urgent" && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        {announcement.title}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">{announcement.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Keyboard shortcuts hint */}
      <footer className={`fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border ${isFullscreen && !showTabs ? "opacity-0" : ""}`}>
        <span className="hidden md:inline">
          Keyboard: <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">F</kbd> fullscreen | 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground ml-2">←</kbd><kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">→</kbd> navigate | 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground ml-2">R</kbd> auto-rotate | 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground ml-2">H</kbd> hide controls | 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground ml-2">1-3</kbd> jump to tab
        </span>
        <span className="md:hidden">Tap arrows to navigate</span>
      </footer>
    </div>
  )
}
