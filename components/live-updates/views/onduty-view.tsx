"use client"

import { ClipboardList, UserRound } from "lucide-react"
import type { OnDutyAssignment } from "@/lib/live-updates/on-duty"

export function OndutyView({ assignments }: { assignments: OnDutyAssignment[] }) {
  const filled = assignments.filter((a) => a.person)
  const open = assignments.filter((a) => !a.person)
  const rows = [...filled, ...open].slice(0, 12)

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="relative flex w-full max-w-7xl flex-col items-center">
        <div className="lu-panel relative mb-6 w-full overflow-hidden p-8 text-center sm:p-10">
          <div className="relative mb-3 flex items-center justify-center gap-5">
            <div className="lu-pin-lake-surface lu-pin-lake-border rounded-2xl border p-4">
              <ClipboardList className="lu-text-schedule h-10 w-10" aria-hidden="true" />
            </div>
            <h2 className="lu-type-board-xl">On duty</h2>
          </div>
          <p className="lu-type-label-lg lu-text-schedule opacity-80">Special assignments</p>
        </div>

        {rows.length === 0 ? (
          <div className="lu-panel relative flex w-full max-w-3xl flex-col items-center justify-center p-12">
            <UserRound className="lu-icon-muted mb-6 h-24 w-24" aria-hidden="true" />
            <h3 className="lu-type-board-lg lu-text-muted">Nobody scheduled yet</h3>
            <p className="lu-type-board-sm lu-text-subtle mt-3">Check back once staff fill today&apos;s slots.</p>
          </div>
        ) : (
          <div className="lu-panel relative w-full overflow-hidden p-6 sm:p-8">
            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
              {rows.map((row) => (
                <div key={row.id} className="lu-panel-inner p-5 sm:p-6">
                  <p className="lu-type-label lu-text-schedule mb-2 opacity-85">{row.activity}</p>
                  <p
                    className={`lu-type-board-lg leading-tight text-balance ${
                      row.person ? "" : "lu-text-muted italic"
                    }`}
                  >
                    {row.person ?? "Unassigned"}
                  </p>
                  {(row.timeLabel || row.date) && (
                    <p className="lu-type-board-sm lu-text-secondary mt-2">
                      {[row.timeLabel, row.date].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
