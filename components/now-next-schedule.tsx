'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, ChevronRight, ArrowDown } from 'lucide-react'
import { WeatherForecast } from '@/components/weather-forecast'
import { Button } from '@/components/ui/button'

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
  startHour: number
  startMinute: number
  endHour?: number
  endMinute?: number
  title: string
  location?: string
}

// Helper to get current time in Central Time
function getCentralTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
}

// Helper to get the day anchor ID from a date
function getDayAnchorId(dateStr: string): string {
  const dayMap: Record<string, string> = {
    '2027-05-03': 'saturday',
    '2027-05-04': 'sunday',
    '2027-05-05': 'monday',
    '2027-05-06': 'tuesday',
    '2027-05-07': 'wednesday',
  }
  return dayMap[dateStr] || 'saturday'
}

// Scroll to the current activity on the schedule
function scrollToNow(currentItem: ScheduleItem | null, nextItem: ScheduleItem | null) {
  // Determine which day to scroll to
  const item = currentItem || nextItem
  if (!item) return

  const dayId = getDayAnchorId(item.date)
  const element = document.getElementById(dayId)
  
  if (element) {
    const offset = 100
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    })
  }
}

// Helper to create a Central Time date for comparison
function createCentralDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Create a date string in Central Time format
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  // Parse in Central timezone
  const centralDate = new Date(new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  // Return a date object that represents this Central time
  return new Date(dateStr)
}

const SCHEDULE_ITEMS: ScheduleItem[] = [
  // Saturday May 3
  { date: '2027-05-03', day: 'Saturday', time: '1:00 PM - 5:15 PM', startHour: 13, startMinute: 0, endHour: 17, endMinute: 15, title: 'Check-in at Activity Center', location: 'Activity Center' },
  { date: '2027-05-03', day: 'Saturday', time: '4:00 PM - 5:00 PM', startHour: 16, startMinute: 0, endHour: 17, endMinute: 0, title: 'Ice Breaker Game', location: 'AC Room 205/206' },
  { date: '2027-05-03', day: 'Saturday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2027-05-03', day: 'Saturday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Introductions', location: 'AC Room 207' },
  { date: '2027-05-03', day: 'Saturday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Black-light Dodgeball & Games', location: 'Activity Center' },
  { date: '2027-05-03', day: 'Saturday', time: '9:00 PM', startHour: 21, startMinute: 0, title: 'Nine Square & Knockout', location: 'Activity Center' },

  // Sunday May 4
  { date: '2027-05-04', day: 'Sunday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2027-05-04', day: 'Sunday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2027-05-04', day: 'Sunday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'Young Adult & Mom\'s Session', location: 'Activity Center' },
  { date: '2027-05-04', day: 'Sunday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2027-05-04', day: 'Sunday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Archery, Obstacle Course & Rope Games', location: 'Various' },
  { date: '2027-05-04', day: 'Sunday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2027-05-04', day: 'Sunday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2027-05-04', day: 'Sunday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Gym Time & Table Games', location: 'Activity Center' },

  // Monday May 5
  { date: '2027-05-05', day: 'Monday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2027-05-05', day: 'Monday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Group Picture', location: 'AC Room 207' },
  { date: '2027-05-05', day: 'Monday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'General / Family Session', location: 'Activity Center' },
  { date: '2027-05-05', day: 'Monday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2027-05-05', day: 'Monday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Afternoon Activities', location: 'Various' },
  { date: '2027-05-05', day: 'Monday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner', location: 'Lakeside Dining Room' },
  { date: '2027-05-05', day: 'Monday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly & Announcements', location: 'AC Room 207' },
  { date: '2027-05-05', day: 'Monday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Game Night & Bonfire', location: 'Activity Center' },

  // Tuesday May 6
  { date: '2027-05-06', day: 'Tuesday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2027-05-06', day: 'Tuesday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Morning Assembly & Announcements', location: 'AC Room 207' },
  { date: '2027-05-06', day: 'Tuesday', time: '10:00 AM', startHour: 10, startMinute: 0, title: 'Session Time', location: 'Activity Center' },
  { date: '2027-05-06', day: 'Tuesday', time: '12:00 PM', startHour: 12, startMinute: 0, title: 'Lunch', location: 'Lakeside Dining Room' },
  { date: '2027-05-06', day: 'Tuesday', time: '1:30 PM', startHour: 13, startMinute: 30, title: 'Afternoon Activities', location: 'Various' },
  { date: '2027-05-06', day: 'Tuesday', time: '5:30 PM', startHour: 17, startMinute: 30, title: 'Dinner & Awards Ceremony', location: 'Lakeside Dining Room' },
  { date: '2027-05-06', day: 'Tuesday', time: '7:00 PM', startHour: 19, startMinute: 0, title: 'Evening Assembly', location: 'AC Room 207' },
  { date: '2027-05-06', day: 'Tuesday', time: '8:00 PM', startHour: 20, startMinute: 0, title: 'Evening Activities', location: 'Activity Center' },

  // Wednesday May 7
  { date: '2027-05-07', day: 'Wednesday', time: '7:30 AM', startHour: 7, startMinute: 30, title: 'Breakfast', location: 'Lakeside Dining Room' },
  { date: '2027-05-07', day: 'Wednesday', time: '9:00 AM', startHour: 9, startMinute: 0, title: 'Final Assembly & Farewell', location: 'AC Room 207' },
  { date: '2027-05-07', day: 'Wednesday', time: '11:00 AM', startHour: 11, startMinute: 0, title: 'Event Concludes / Checkout', location: 'Various' },
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
      const targetDate = Date.UTC(2027, 4, 3, 18, 0, 0) // May 3, 2027 at 1:00 PM Central Time
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
      // Get current time in Central Time
      const centralNow = getCentralTime()
      const centralHour = centralNow.getHours()
      const centralMinute = centralNow.getMinutes()
      // Use local date parts, NOT toISOString() which converts to UTC and can
      // shift the date forward by a day in the evening (Central is UTC-5/6).
      const year = centralNow.getFullYear()
      const month = String(centralNow.getMonth() + 1).padStart(2, '0')
      const day = String(centralNow.getDate()).padStart(2, '0')
      const centralDateStr = `${year}-${month}-${day}`

      setTimeLeft(calculateTimeLeft())

      // Event start: May 3, 2027 at 1:00 PM Central
      // Event end: May 7, 2027 at 11:00 AM Central
      const eventStartDate = '2027-05-03'
      const eventEndDate = '2027-05-07'

      // Check if before event
      if (centralDateStr < eventStartDate || (centralDateStr === eventStartDate && (centralHour < 13 || (centralHour === 13 && centralMinute === 0)))) {
        if (centralDateStr < eventStartDate || centralHour < 13) {
          setEventStatus('before')
          setNowItem(null)
          setNextItem(SCHEDULE_ITEMS[0])
          return
        }
      }

      // Check if after event
      if (centralDateStr > eventEndDate || (centralDateStr === eventEndDate && centralHour >= 11)) {
        setEventStatus('after')
        setNowItem(null)
        setNextItem(null)
        return
      }

      // During event
      setEventStatus('during')

      let current: ScheduleItem | null = null
      let next: ScheduleItem | null = null

      // Find current and next items based on Central Time
      for (let i = 0; i < SCHEDULE_ITEMS.length; i++) {
        const item = SCHEDULE_ITEMS[i]
        const nextScheduleItem = SCHEDULE_ITEMS[i + 1]

        // Check if this item is on today's date
        if (item.date !== centralDateStr) continue

        const itemStartMinutes = item.startHour * 60 + item.startMinute
        const currentMinutes = centralHour * 60 + centralMinute

        // Calculate end time
        let itemEndMinutes: number
        if (item.endHour !== undefined && item.endMinute !== undefined) {
          itemEndMinutes = item.endHour * 60 + item.endMinute
        } else {
          // Default to 1 hour duration if no end time specified
          itemEndMinutes = itemStartMinutes + 60
        }

        // Check if current time is within this item's window
        if (currentMinutes >= itemStartMinutes && currentMinutes < itemEndMinutes) {
          current = item
          // Find next item (could be later today or tomorrow)
          for (let j = i + 1; j < SCHEDULE_ITEMS.length; j++) {
            const potentialNext = SCHEDULE_ITEMS[j]
            const nextStartMinutes = potentialNext.startHour * 60 + potentialNext.startMinute
            if (potentialNext.date === centralDateStr && nextStartMinutes > currentMinutes) {
              next = potentialNext
              break
            } else if (potentialNext.date > centralDateStr) {
              next = potentialNext
              break
            }
          }
          break
        }
      }

      // If no current item, find the next upcoming one
      if (!current) {
        const currentMinutes = centralHour * 60 + centralMinute
        for (const item of SCHEDULE_ITEMS) {
          if (item.date === centralDateStr) {
            const itemStartMinutes = item.startHour * 60 + item.startMinute
            if (itemStartMinutes > currentMinutes) {
              next = item
              break
            }
          } else if (item.date > centralDateStr) {
            next = item
            break
          }
        }
      }

      setNowItem(current)
      setNextItem(next)
    }

    updateSchedule()
    const interval = setInterval(updateSchedule, 1000)

    return () => clearInterval(interval)
  }, [])

  // Loading state
  if (!mounted) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-ring">Loading Schedule...</h3>
        </div>
      </div>
    )
  }

  // Before event - show weather and next up events immediately
  if (eventStatus === 'before') {
    // Get first few events to preview
    const previewEvents = SCHEDULE_ITEMS.slice(0, 6)
    
    return (
      <div className="w-full space-y-4">
        {/* Weather Section - shows immediately */}
        <WeatherForecast />

        {/* Next Up Events */}
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-accent p-2">
                  <ChevronRight className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Next Up</CardTitle>
                  <CardDescription>What&apos;s happening at Rendezvous</CardDescription>
                </div>
              </div>
              {/* Live updating indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-medium text-primary">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {previewEvents.map((event, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                >
                  <div className="flex flex-col items-center shrink-0 min-w-[60px]">
                    <span className="text-xs font-medium text-muted-foreground">{event.day}</span>
                    <span className="text-sm font-bold text-primary">{event.time.split(' - ')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">{event.title}</h4>
                    {event.location && (
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              ...and much more! Scroll down to see the full schedule.
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToNow(null, previewEvents[0])}
                className="flex items-center gap-2"
              >
                <ArrowDown className="h-4 w-4" />
                Jump to Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // After event
  if (eventStatus === 'after') {
    return (
      <Card className="border-secondary/50">
        <CardHeader>
          <CardTitle className="text-lg text-center">Rendezvous 2027 Has Concluded</CardTitle>
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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
        <h3 className="text-2xl font-bold text-ring">Live Schedule</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scrollToNow(nowItem, nextItem)}
          className="flex items-center gap-2"
        >
          <ArrowDown className="h-4 w-4" />
          Jump to Now
        </Button>
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
