'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, ChevronRight } from 'lucide-react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface ScheduleItem {
  date: string
  day: string
  time: string
  startTime: Date
  title: string
  location?: string
}

const SCHEDULE_ITEMS: ScheduleItem[] = [
  // Monday May 4
  { date: '2026-05-04', day: 'Monday', time: '1:00 PM - 5:15 PM', startTime: new Date('2026-05-04T13:00:00'), title: 'Check-in at Activity Center', location: 'Activity Center' },
  { date: '2026-05-04', day: 'Monday', time: '4:00 PM - 5:00 PM', startTime: new Date('2026-05-04T16:00:00'), title: 'Ice Breaker Game', location: 'AC Room 205/206' },
  { date: '2026-05-04', day: 'Monday', time: '5:30 PM', startTime: new Date('2026-05-04T17:30:00'), title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2026-05-04', day: 'Monday', time: '7:00 PM', startTime: new Date('2026-05-04T19:00:00'), title: 'Evening Assembly & Introductions', location: 'AC Room 207' },
  { date: '2026-05-04', day: 'Monday', time: '8:00 PM', startTime: new Date('2026-05-04T20:00:00'), title: 'Black-light Dodgeball & Games', location: 'Activity Center' },
  { date: '2026-05-04', day: 'Monday', time: '9:00 PM', startTime: new Date('2026-05-04T21:00:00'), title: 'Nine Square & Knockout', location: 'Activity Center' },

  // Tuesday May 5
  { date: '2026-05-05', day: 'Tuesday', time: '7:30 AM', startTime: new Date('2026-05-05T07:30:00'), title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-05', day: 'Tuesday', time: '9:00 AM', startTime: new Date('2026-05-05T09:00:00'), title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-05', day: 'Tuesday', time: '10:00 AM', startTime: new Date('2026-05-05T10:00:00'), title: 'Young Adult & Mom\'s Session', location: 'Activity Center' },
  { date: '2026-05-05', day: 'Tuesday', time: '12:00 PM', startTime: new Date('2026-05-05T12:00:00'), title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2026-05-05', day: 'Tuesday', time: '1:30 PM', startTime: new Date('2026-05-05T13:30:00'), title: 'Archery, Obstacle Course & Rope Games', location: 'Various' },
  { date: '2026-05-05', day: 'Tuesday', time: '5:30 PM', startTime: new Date('2026-05-05T17:30:00'), title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2026-05-05', day: 'Tuesday', time: '7:00 PM', startTime: new Date('2026-05-05T19:00:00'), title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-05', day: 'Tuesday', time: '8:00 PM', startTime: new Date('2026-05-05T20:00:00'), title: 'Gym Time & Table Games', location: 'Activity Center' },

  // Wednesday May 6
  { date: '2026-05-06', day: 'Wednesday', time: '7:30 AM', startTime: new Date('2026-05-06T07:30:00'), title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-06', day: 'Wednesday', time: '9:00 AM', startTime: new Date('2026-05-06T09:00:00'), title: 'Morning Assembly & Group Picture', location: 'AC Room 207' },
  { date: '2026-05-06', day: 'Wednesday', time: '10:00 AM', startTime: new Date('2026-05-06T10:00:00'), title: 'General / Family Session', location: 'Activity Center' },
  { date: '2026-05-06', day: 'Wednesday', time: '12:00 PM', startTime: new Date('2026-05-06T12:00:00'), title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2026-05-06', day: 'Wednesday', time: '1:30 PM', startTime: new Date('2026-05-06T13:30:00'), title: 'Afternoon Activities', location: 'Various' },
  { date: '2026-05-06', day: 'Wednesday', time: '5:30 PM', startTime: new Date('2026-05-06T17:30:00'), title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2026-05-06', day: 'Wednesday', time: '7:00 PM', startTime: new Date('2026-05-06T19:00:00'), title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-06', day: 'Wednesday', time: '8:00 PM', startTime: new Date('2026-05-06T20:00:00'), title: 'Game Night & Bonfire', location: 'Activity Center' },

  // Thursday May 7
  { date: '2026-05-07', day: 'Thursday', time: '7:30 AM', startTime: new Date('2026-05-07T07:30:00'), title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-07', day: 'Thursday', time: '9:00 AM', startTime: new Date('2026-05-07T09:00:00'), title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2026-05-07', day: 'Thursday', time: '10:00 AM', startTime: new Date('2026-05-07T10:00:00'), title: 'Session Time', location: 'Activity Center' },
  { date: '2026-05-07', day: 'Thursday', time: '12:00 PM', startTime: new Date('2026-05-07T12:00:00'), title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2026-05-07', day: 'Thursday', time: '1:30 PM', startTime: new Date('2026-05-07T13:30:00'), title: 'Afternoon Activities', location: 'Various' },
  { date: '2026-05-07', day: 'Thursday', time: '5:30 PM', startTime: new Date('2026-05-07T17:30:00'), title: 'Dinner & Awards Ceremony', location: 'Lakeside Dining Room' },
  { date: '2026-05-07', day: 'Thursday', time: '7:00 PM', startTime: new Date('2026-05-07T19:00:00'), title: 'Evening Assembly', location: 'AC Room 207' },
  { date: '2026-05-07', day: 'Thursday', time: '8:00 PM', startTime: new Date('2026-05-07T20:00:00'), title: 'Evening Activities', location: 'Activity Center' },

  // Friday May 8
  { date: '2026-05-08', day: 'Friday', time: '7:30 AM', startTime: new Date('2026-05-08T07:30:00'), title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2026-05-08', day: 'Friday', time: '9:00 AM', startTime: new Date('2026-05-08T09:00:00'), title: 'Final Assembly & Farewell', location: 'AC Room 207' },
  { date: '2026-05-08', day: 'Friday', time: '11:00 AM', startTime: new Date('2026-05-08T11:00:00'), title: 'Event Concludes / Checkout', location: 'Various' },
]

export function NowNextSchedule() {
  const [nowItem, setNowItem] = useState<ScheduleItem | null>(null)
  const [nextItem, setNextItem] = useState<ScheduleItem | null>(null)
  const [eventStatus, setEventStatus] = useState<'before' | 'during' | 'after'>('before')
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const calculateTimeLeft = (): TimeLeft => {
      const targetDate = Date.UTC(2026, 4, 4, 18, 0, 0) // May 4, 2026 at 1:00 PM Central Time
      const now = Date.now()
      const difference = targetDate - now

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    const updateSchedule = () => {
      const now = new Date()
      const eventStart = new Date('2026-05-04T13:00:00')
      const eventEnd = new Date('2026-05-08T11:00:00')

      setTimeLeft(calculateTimeLeft())

      if (now < eventStart) {
        setEventStatus('before')
        setNowItem(null)
        setNextItem(SCHEDULE_ITEMS[0])
      } else if (now > eventEnd) {
        setEventStatus('after')
        setNowItem(null)
        setNextItem(null)
      } else {
        setEventStatus('during')

        let current = null
        let next = null

        for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
          const item = SCHEDULE_ITEMS[i]
          const nextScheduleItem = SCHEDULE_ITEMS[i + 1]

          let itemEndTime = item.startTime
          if (item.time.includes(' - ')) {
            const endTimeStr = item.time.split(' - ')[1]
            const [time, period] = endTimeStr.split(' ')
            let [hours, minutes] = time.split(':').map(Number)
            if (period === 'PM' && hours !== 12) hours += 12
            if (period === 'AM' && hours === 12) hours = 0
            itemEndTime = new Date(item.startTime)
            itemEndTime.setHours(hours, minutes)
          } else {
            itemEndTime = new Date(item.startTime)
            itemEndTime.setHours(itemEndTime.getHours() + 1)
          }

          if (now >= item.startTime && now < itemEndTime) {
            current = item
            next = nextScheduleItem || null
            break
          }
        }

        if (!current) {
          for (const item of SCHEDULE_ITEMS) {
            if (item.startTime > now) {
              next = item
              break
            }
          }
        }

        setNowItem(current)
        setNextItem(next)
      }
    }

    updateSchedule()
    const interval = setInterval(updateSchedule, 1000)

    return () => clearInterval(interval)
  }, [])

  // Loading state
  if (!mounted) {
    return (
      <div className="w-full">
        <div className="mb-4 text-center">
          <h3 className="text-2xl font-bold text-ring">Event Starts In</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
            <Card key={label} className="border-secondary-foreground/20 bg-primary text-background">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-2">--</div>
                <div className="text-xs sm:text-sm text-secondary-foreground/70">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-ring">May 4, 2026 at 1:00 PM Central Time</p>
        </div>
      </div>
    )
  }

  // Before event - show countdown
  if (eventStatus === 'before') {
    return (
      <div className="w-full">
        <div className="mb-4 text-center">
          <h3 className="text-2xl font-bold text-ring">Event Starts In</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { label: "Days", value: timeLeft.days },
            { label: "Hours", value: timeLeft.hours },
            { label: "Minutes", value: timeLeft.minutes },
            { label: "Seconds", value: timeLeft.seconds },
          ].map((item) => (
            <Card key={item.label} className="border-secondary-foreground/20 bg-primary text-background">
              <CardContent className="p-4 sm:p-6 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-secondary-foreground mb-2">
                  {String(item.value).padStart(2, "0")}
                </div>
                <div className="text-xs sm:text-sm text-secondary-foreground/70">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-ring">May 4, 2026 at 1:00 PM Central Time</p>
        </div>
      </div>
    )
  }

  // After event
  if (eventStatus === 'after') {
    return (
      <Card className="border-secondary/50">
        <CardHeader>
          <CardTitle className="text-lg text-center">Rendezvous 2026 Has Concluded</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            Thank you for joining us! We hope you had an amazing time. See you next year!
          </p>
        </CardContent>
      </Card>
    )
  }

  // During event - show now & next
  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold text-ring">Live Schedule</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Now Playing */}
        {nowItem ? (
          <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="rounded-full bg-primary p-2">
                    <Clock className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold text-muted-foreground">HAPPENING NOW</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">{nowItem.title}</h3>
              <CardDescription className="text-base font-medium">{nowItem.time}</CardDescription>
              {nowItem.location && (
                <p className="text-sm text-muted-foreground">Location: {nowItem.location}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-muted/50 bg-gradient-to-br from-muted/10 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-muted p-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-sm font-semibold text-muted-foreground">HAPPENING NOW</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-lg font-medium text-muted-foreground">Free Time</h3>
              <CardDescription>No scheduled activity right now</CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Up Next */}
        {nextItem && (
          <Card className="border-accent/50 bg-gradient-to-br from-accent/10 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent p-2">
                  <ChevronRight className="h-4 w-4 text-accent-foreground" />
                </div>
                <CardTitle className="text-sm font-semibold text-muted-foreground">UP NEXT</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">{nextItem.title}</h3>
              <CardDescription className="text-base font-medium">{nextItem.time}</CardDescription>
              {nextItem.location && (
                <p className="text-sm text-muted-foreground">Location: {nextItem.location}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
