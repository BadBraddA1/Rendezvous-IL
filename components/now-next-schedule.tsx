'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, ChevronRight } from 'lucide-react'

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
  const [eventStarted, setEventStarted] = useState(false)

  useEffect(() => {
    const updateSchedule = () => {
      const now = new Date()
      const eventStart = new Date('2026-05-04T13:00:00')
      const eventEnd = new Date('2026-05-08T11:00:00')

      if (now < eventStart) {
        // Event hasn't started yet
        setEventStarted(false)
        setNowItem(null)
        setNextItem(SCHEDULE_ITEMS[0])
      } else if (now > eventEnd) {
        // Event is over
        setEventStarted(false)
        setNowItem(null)
        setNextItem(null)
      } else {
        // Event is happening
        setEventStarted(true)

        // Find current event
        let current = null
        let next = null

        for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
          const item = SCHEDULE_ITEMS[i]
          const nextScheduleItem = SCHEDULE_ITEMS[i + 1]

          // Parse end time from time string (simple format like "1:00 PM - 5:15 PM")
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
            // For single time events, assume 1 hour duration
            itemEndTime = new Date(item.startTime)
            itemEndTime.setHours(itemEndTime.getHours() + 1)
          }

          if (now >= item.startTime && now < itemEndTime) {
            current = item
            next = nextScheduleItem || null
            break
          }
        }

        // If no current event found, find next upcoming
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
    const interval = setInterval(updateSchedule, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full space-y-4">
      {eventStarted && nowItem ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Now Playing */}
            <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary p-2">
                    <Clock className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground">HAPPENING NOW</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">{nowItem.title}</h3>
                <CardDescription className="text-base">{nowItem.time}</CardDescription>
                {nowItem.location && (
                  <p className="text-sm text-muted-foreground">📍 {nowItem.location}</p>
                )}
              </CardContent>
            </Card>

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
                  <h3 className="text-lg font-bold text-foreground">{nextItem.title}</h3>
                  <CardDescription className="text-base">{nextItem.time}</CardDescription>
                  {nextItem.location && (
                    <p className="text-sm text-muted-foreground">📍 {nextItem.location}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        <Card className="border-secondary/50">
          <CardHeader>
            <CardTitle className="text-lg">Schedule Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The event will begin on Monday, May 4, 2026 at 1:00 PM. Check back here during the event to see what&apos;s happening now and what&apos;s up next!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
