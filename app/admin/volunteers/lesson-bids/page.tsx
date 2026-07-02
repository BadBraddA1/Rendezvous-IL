import { Suspense } from "react"
import { VolunteerAdminShell } from "../volunteer-admin-shell"
import { VolunteerSection } from "@/components/admin/volunteer-section"

export default function AdminLessonBidsPage() {
  return (
    <VolunteerAdminShell
      currentPage="volunteers-lesson-bids"
      path="/admin/volunteers/lesson-bids"
      title="Lesson Bids"
      description="Maintain the lesson topic list, invite presenters to rank their picks, and award topics."
    >
      {({ canManage }) => (
        <Suspense fallback={<p className="text-muted-foreground">Loading lesson bids...</p>}>
          <VolunteerSection canManage={canManage} section="lesson-bids" />
        </Suspense>
      )}
    </VolunteerAdminShell>
  )
}
