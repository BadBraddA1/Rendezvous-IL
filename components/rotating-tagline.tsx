"use client"

import { useEffect, useState } from "react"

const TAGLINES = [
  "Where Faith Meets Fellowship",
  "Five Days. Countless Memories.",
  "Worship. Play. Connect. Repeat.",
  "Lakeside Worship & Lasting Friendships",
  "Bonfires, Bible Bowl & Belonging",
  "A Retreat Like No Other",
  "Come for the Fellowship, Stay for the Memories",
  "Family. Faith. Fun by the Lake.",
]

interface RotatingTaglineProps {
  className?: string
  intervalMs?: number
}

export function RotatingTagline({ className = "", intervalMs = 3500 }: RotatingTaglineProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const tick = setInterval(() => {
      setVisible(false)
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % TAGLINES.length)
        setVisible(true)
      }, 400)
      return () => clearTimeout(swap)
    }, intervalMs)
    return () => clearInterval(tick)
  }, [intervalMs])

  return (
    <div className={`relative ${className}`}>
      <p
        key={index}
        aria-live="polite"
        className={`transition-all duration-500 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {TAGLINES[index]}
      </p>
    </div>
  )
}
