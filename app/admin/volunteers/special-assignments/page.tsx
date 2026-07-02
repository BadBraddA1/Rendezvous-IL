import { Suspense } from "react"
import { VolunteerAdminShell } from "../volunteer-admin-shell"
import { VolunteerSection } from "@/components/admin/volunteer-section"

export default function AdminSpecialAssignmentsPage() {
  return (
    <VolunteerAdminShell
      currentPage="volunteers-special"
      path="/admin/volunteers/special-assignments"
      title="Special Assignments"
      description="One-off jobs outside the worship service rotation — track who's doing what, and when."
    >
      {({ canManage }) => (
        <Suspense fallback={<p className="text-muted-foreground">Loading special assignments...</p>}>
          <VolunteerSection canManage={canManage} section="special" />
        </Suspense>
      )}
    </VolunteerAdminShell>
  )
}
