"use client"

import { Users } from "lucide-react"
import type { VolunteerSchedule } from "@/lib/live-updates/types"

export function VolunteersView({ 
  volunteerSchedule, 
  volunteerTimeSlot 
}: { 
  volunteerSchedule: VolunteerSchedule | null
  volunteerTimeSlot: string
}) {
  const roles = volunteerSchedule ? [
    { label: "Opening Prayer", value: volunteerSchedule.openingPrayer },
    { label: "Leading Singing [A]", value: volunteerSchedule.leadingSingingA },
    { label: "Leading Singing [B]", value: volunteerSchedule.leadingSingingB },
    { label: "Reading Scripture [A]", value: volunteerSchedule.readingScriptureA, subtitle: volunteerSchedule.lessonScriptureA },
    { label: "Presenting Lesson [A]", value: volunteerSchedule.presentingLessonA, subtitle: volunteerSchedule.lessonTitleA },
    { label: "Reading Scripture [B]", value: volunteerSchedule.readingScriptureB, subtitle: volunteerSchedule.lessonScriptureB },
    { label: "Presenting Lesson [B]", value: volunteerSchedule.presentingLessonB, subtitle: volunteerSchedule.lessonTitleB },
    { label: "Closing Prayer", value: volunteerSchedule.closingPrayer },
  ].filter(r => r.value) : []

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!volunteerSchedule ? (
        <div className="relative w-full max-w-3xl lu-panel p-12 flex flex-col items-center justify-center">
          <Users className="h-32 w-32 lu-icon-muted mb-8 relative" />
          <h2 className="lu-type-board-xl lu-text-muted relative">No Volunteer Schedule</h2>
        </div>
      ) : (
        <div className="relative w-full max-w-7xl flex flex-col items-center">
          {/* Header panel  -  bigger time-slot title and tagline so it reads
              clearly from the back of the room. */}
          <div className="relative w-full overflow-hidden lu-panel p-10 mb-6 text-center">
            <div className="relative flex items-center justify-center gap-5 mb-3">
              <div className="rounded-2xl lu-pin-coral-surface p-4 border lu-pin-coral-border">
                <Users className="h-10 w-10 lu-pin-coral-text" />
              </div>
              <h2 className="lu-type-board-xl">{volunteerTimeSlot}</h2>
            </div>
            <p className="lu-type-label-lg lu-pin-coral-text opacity-80">Devotional Assignments</p>
          </div>

          {/* Roles grid  -  every role card scaled up so the assignee name is
              the dominant element. Labels are still de-emphasized but now
              large enough to be legible across the room. */}
          <div className="relative w-full overflow-hidden lu-panel p-8">
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5">
              {roles.map((role, index) => (
                <div
                  key={index}
                  className="p-6 lu-panel-inner"
                >
                  <p className="lu-type-label lu-pin-coral-text opacity-80 mb-3">{role.label}</p>
                  <p className="lu-type-board-lg leading-tight text-balance">{role.value}</p>
                  {role.subtitle && (
                    <p className="lu-text-muted mt-2 text-balance lu-type-board-sm italic">({role.subtitle})</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
