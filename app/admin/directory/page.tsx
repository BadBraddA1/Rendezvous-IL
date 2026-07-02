import { Suspense } from "react"
import { VolunteerAdminShell } from "@/app/admin/volunteers/volunteer-admin-shell"
import { DirectorySection } from "@/components/admin/directory-section"

export const dynamic = "force-dynamic"

export default function AdminDirectoryPage() {
  return (
    <VolunteerAdminShell
      currentPage="directory"
      path="/admin/directory"
      title="Family Directory"
      description="Edit each family's directory card — names, congregation, address, blurb, photo, listing visibility, and member contact sharing."
    >
      {({ canManage }) => (
        <Suspense fallback={null}>
          <DirectorySection canManage={canManage} />
        </Suspense>
      )}
    </VolunteerAdminShell>
  )
}
