"use client"

import { Megaphone } from "lucide-react"
import type { Announcement } from "@/lib/live-updates/types"

export function AnnouncementsView({ announcements }: { announcements: Announcement[] }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {announcements.length === 0 ? (
        <div className="relative w-full max-w-2xl lu-panel p-12 flex flex-col items-center justify-center">
          <Megaphone className="h-24 w-24 lu-text-meal opacity-60 mb-6 relative" />
          <h2 className="lu-type-board-lg lu-text-meal opacity-80 relative">No Announcements</h2>
        </div>
      ) : (
        <div className="relative w-full max-w-7xl flex flex-col items-center">
          {/* Header panel */}
          <div className="relative w-full overflow-hidden lu-panel p-7 mb-5 text-center">
            <div className="relative flex items-center justify-center gap-4">
              <div className="rounded-xl lu-announce-header p-3 border">
                <Megaphone className="h-7 w-7 lu-text-meal" />
              </div>
              <h2 className="lu-type-board-lg lu-text-meal">Announcements</h2>
            </div>
          </div>

          {/* Announcements list */}
          <div className="w-full space-y-4">
            {announcements.map((announcement) => {
              const isUrgent = announcement.priority === "urgent"
              const isHigh = announcement.priority === "high"
              const palette = isUrgent
                ? { border: "lu-priority-urgent-border", icon: "lu-priority-urgent-text", badge: "URGENT" }
                : isHigh
                ? { border: "lu-priority-high-border", icon: "lu-priority-high-text", badge: "IMPORTANT" }
                : { border: "border-white/10", icon: "lu-priority-normal-text", badge: null }

              return (
                <div
                  key={announcement.id}
                  className={`relative overflow-hidden lu-panel border ${palette.border} p-6`}
                >
                  {palette.badge && (
                    <div className="relative mb-3">
                      <span className={`inline-block px-3 py-1 rounded-full lu-type-label-sm font-bold ${palette.icon} bg-white/[0.05] border ${palette.border}`}>
                        {palette.badge}
                      </span>
                    </div>
                  )}
                  <h3 className="relative lu-type-board-sm font-bold mb-2 text-balance">{announcement.title}</h3>
                  <p className="relative text-lg lu-text-secondary whitespace-pre-wrap leading-relaxed">{announcement.message}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
