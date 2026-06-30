"use client"

import { memo, useEffect, useState } from "react"
import { getCentralTime } from "@/lib/live-updates/time"

function formatClockParts(date: Date) {
  const hours24 = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours24 >= 12 ? "PM" : "AM"
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return {
    time: `${hours12}:${String(minutes).padStart(2, "0")}  ${ampm}`,
    date: `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`,
  }
}

/** Header clock — ticks every second without re-rendering the LU view tree. */
export const LiveUpdatesClock = memo(function LiveUpdatesClock() {
  const [now, setNow] = useState(() => getCentralTime())

  useEffect(() => {
    setNow(getCentralTime())
    const id = setInterval(() => setNow(getCentralTime()), 1000)
    return () => clearInterval(id)
  }, [])

  const { time, date } = formatClockParts(now)

  return (
    <div className="text-right shrink-0">
      <div className="text-2xl sm:text-4xl font-light tracking-wider tabular-nums leading-none">{time}</div>
      <div className="lu-text-muted text-sm sm:text-base mt-1 whitespace-nowrap">{date}</div>
    </div>
  )
})
