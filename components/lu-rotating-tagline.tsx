"use client"

import { useEffect, useState } from "react"

const TAGLINES = [
  "Five Days. One Family. Endless Memories.",
  "Where Faith Meets Adventure.",
  "Rooted in Christ. Growing Together.",
  "Worship. Play. Connect. Belong.",
  "More Than a Retreat — A Homecoming.",
  "Building Lifelong Friendships in Christ.",
  "Faith, Family, and the Great Outdoors.",
  "Iron Sharpens Iron. Proverbs 27:17",
  "A Time to Refresh. A Place to Belong.",
  "Together in Worship. United in Purpose.",
]

export function LuRotatingTagline({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % TAGLINES.length)
        setIsVisible(true)
      }, 600)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={className}>
      <span
        className={`inline-block transition-all duration-500 ease-out ${
          isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 -translate-y-2 blur-sm"
        }`}
      >
        {TAGLINES[index]}
      </span>
    </div>
  )
}
