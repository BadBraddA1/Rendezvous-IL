import { Suspense } from "react"
import { VolunteerAdminShell } from "./volunteer-admin-shell"
import { VolunteerSection } from "@/components/admin/volunteer-section"

export default function AdminVolunteersPage() {
  return (
    <VolunteerAdminShell
      currentPage="volunteers-worship"
      path="/admin/volunteers"
      title="Worship Service Volunteers"
      description="Assign registered volunteers to morning and evening devotions. Changes show up on the public schedule right away."
    >
      {({ canManage }) => (
        <Suspense fallback={<p className="text-muted-foreground">Loading volunteers...</p>}>
          <VolunteerSection canManage={canManage} section="worship" />
        </Suspense>
      )}
    </VolunteerAdminShell>
  )
}
