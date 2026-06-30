"use client"

import { useState, useEffect, useCallback } from "react"
import { Volume2, VolumeX, Bell, BellOff, Clock, Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const SILENT_DURATION = 30 * 60 // 30 minutes in seconds

export default function SilentPhonePage() {
  const [isActive, setIsActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(SILENT_DURATION)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (!isActive || isPaused) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsActive(false)
          return SILENT_DURATION
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, isPaused])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  const progress = ((SILENT_DURATION - timeRemaining) / SILENT_DURATION) * 100

  const handleStart = () => {
    setIsActive(true)
    setIsPaused(false)
    setTimeRemaining(SILENT_DURATION)
  }

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev)
  }

  const handleStop = () => {
    setIsActive(false)
    setTimeRemaining(SILENT_DURATION)
    setIsPaused(false)
  }

  const handleReset = () => {
    setTimeRemaining(SILENT_DURATION)
    setIsPaused(false)
  }

  return (
    <div className="brand-dark-shell flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-primary/20 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href="/" className="brand-dark-link focus-ring rounded-sm">
          &larr; Back
        </Link>
        <p className="text-sm font-medium brand-dark-text-muted">Silent mode</p>
        <div className="w-16" aria-hidden="true" />
      </header>

      <main id="main-content" className="flex flex-1 flex-col items-center justify-center p-8">
        {!isActive ? (
          <div className="space-y-8 text-center">
            <div className="relative">
              <div className="brand-dark-surface mx-auto flex h-48 w-48 items-center justify-center rounded-full border-4 border-primary/30">
                <Volume2 className="h-24 w-24 text-primary" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-section-title text-balance">Silence your phone</h1>
              <p className="text-lead mx-auto max-w-md brand-dark-text-muted">
                Activate silent mode for 30 minutes during sessions or assemblies. A timer will remind
                you when it&apos;s safe to unmute.
              </p>
            </div>

            <Button onClick={handleStart} size="lg" variant="destructive" className="rounded-full px-12 py-6 text-xl">
              <BellOff className="mr-3 h-6 w-6" aria-hidden="true" />
              Start silent mode
            </Button>

            <p className="flex items-center justify-center gap-2 text-sm brand-dark-text-subtle">
              <Clock className="h-4 w-4" aria-hidden="true" />
              30 minutes
            </p>
          </div>
        ) : (
          <div className="space-y-8 text-center">
            <h1 className="sr-only">Silent mode timer</h1>

            <div className="relative">
              <svg className="h-64 w-64 -rotate-90 transform" aria-hidden="true">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="brand-dark-track"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                  className="text-destructive transition-all duration-1000 motion-reduce:transition-none"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <VolumeX
                  className={`mb-2 h-16 w-16 ${isPaused ? "brand-dark-paused" : "text-destructive"}`}
                  aria-hidden="true"
                />
                <span className="text-timer-mono">{formatTime(timeRemaining)}</span>
                <span className="mt-2 brand-dark-text-muted">{isPaused ? "Paused" : "Silent mode"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-subheading flex items-center justify-center gap-3">
                <BellOff className={isPaused ? "brand-dark-paused" : "text-destructive"} aria-hidden="true" />
                {isPaused ? "Timer paused" : "Phone should be silent"}
              </h2>
              <p className="brand-dark-text-muted">
                {isPaused ? "Resume the timer when ready." : "Please keep your phone on silent or vibrate."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button onClick={handlePauseResume} variant="outline" size="lg" className="border-primary/25 bg-transparent hover:bg-primary/10">
                {isPaused ? (
                  <>
                    <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-5 w-5" aria-hidden="true" />
                    Pause
                  </>
                )}
              </Button>

              <Button onClick={handleReset} variant="outline" size="lg" className="border-primary/25 bg-transparent hover:bg-primary/10">
                <RotateCcw className="mr-2 h-5 w-5" aria-hidden="true" />
                Reset
              </Button>

              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <Bell className="mr-2 h-5 w-5" aria-hidden="true" />
                End silent
              </Button>
            </div>

            <div className="brand-dark-surface mx-auto max-w-md rounded-xl p-4">
              <p className="text-sm brand-dark-text-body">
                <span className="font-semibold brand-dark-text-strong">Reminder:</span> When the timer
                ends, you can unmute your phone. Please be respectful during sessions and assemblies.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-primary/20 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm brand-dark-text-subtle">
        Rendezvous 2027
      </footer>
    </div>
  )
}
