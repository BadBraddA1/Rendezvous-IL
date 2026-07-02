import { Suspense } from "react"
import { VolunteerAdminShell } from "../volunteers/volunteer-admin-shell"
import { ScheduleSection } from "@/components/admin/schedule-section"

export const metadata = {
  title: "Schedule | Admin",
}

export default function AdminSchedulePage() {
  return (
    <VolunteerAdminShell
      currentPage="schedule"
      path="/admin/schedule"
      title="Event Schedule"
      description="Edit the daily schedule shown on the public site, print page, PDF, and mobile apps."
    >
      {({ canManage }) => (
        <Suspense fallback={<p className="text-muted-foreground">Loading schedule...</p>}>
          <ScheduleSection canManage={canManage} />
        </Suspense>
      )}
    </VolunteerAdminShell>
  )
}
