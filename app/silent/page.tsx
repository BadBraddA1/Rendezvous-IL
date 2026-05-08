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

  // Countdown timer
  useEffect(() => {
    if (!isActive || isPaused) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsActive(false)
          return SILENT_DURATION
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, isPaused])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Calculate progress percentage
  const progress = ((SILENT_DURATION - timeRemaining) / SILENT_DURATION) * 100

  const handleStart = () => {
    setIsActive(true)
    setIsPaused(false)
    setTimeRemaining(SILENT_DURATION)
  }

  const handlePauseResume = () => {
    setIsPaused(prev => !prev)
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="text-white/60 hover:text-white transition-colors">
          &larr; Back
        </Link>
        <h1 className="text-lg font-semibold">Silent Mode</h1>
        <div className="w-16" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {!isActive ? (
          // Inactive state
          <div className="text-center space-y-8">
            <div className="relative">
              <div className="w-48 h-48 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center mx-auto">
                <Volume2 className="w-24 h-24 text-slate-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Silence Your Phone</h2>
              <p className="text-white/60 max-w-md">
                Activate silent mode for 30 minutes during sessions or assemblies. 
                A timer will remind you when it&apos;s safe to unmute.
              </p>
            </div>

            <Button 
              onClick={handleStart}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-xl rounded-full"
            >
              <BellOff className="w-6 h-6 mr-3" />
              Start Silent Mode
            </Button>

            <p className="text-white/40 text-sm flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              30 minutes
            </p>
          </div>
        ) : (
          // Active state
          <div className="text-center space-y-8">
            {/* Circular progress */}
            <div className="relative">
              <svg className="w-64 h-64 transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                />
                {/* Progress circle */}
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
                  className="text-red-500 transition-all duration-1000"
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <VolumeX className={`w-16 h-16 mb-2 ${isPaused ? 'text-yellow-500' : 'text-red-500'}`} />
                <span className="text-5xl font-mono font-bold">{formatTime(timeRemaining)}</span>
                <span className="text-white/60 mt-2">
                  {isPaused ? 'PAUSED' : 'SILENT MODE'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-3">
                <BellOff className={isPaused ? 'text-yellow-500' : 'text-red-500'} />
                {isPaused ? 'Timer Paused' : 'Phone Should Be Silent'}
              </h2>
              <p className="text-white/60">
                {isPaused 
                  ? 'Resume the timer when ready' 
                  : 'Please keep your phone on silent or vibrate'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handlePauseResume}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white/10"
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                )}
              </Button>

              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="border-white/20 hover:bg-white/10"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset
              </Button>

              <Button
                onClick={handleStop}
                variant="outline"
                size="lg"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Bell className="w-5 h-5 mr-2" />
                End Silent
              </Button>
            </div>

            {/* Reminder */}
            <div className="bg-slate-800/50 rounded-xl p-4 max-w-md mx-auto border border-white/10">
              <p className="text-sm text-white/70">
                <span className="font-semibold text-white">Reminder:</span> When the timer ends, 
                you can unmute your phone. Please be respectful during sessions and assemblies.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-white/40 text-sm border-t border-white/10">
        Rendezvous 2027
      </footer>
    </div>
  )
}
