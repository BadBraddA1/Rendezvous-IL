import { AdminNav } from "@/components/admin/admin-nav"
import { SongPacksManager } from "@/components/admin/song-packs-manager"
import { SongOcrReviewQueue } from "@/components/admin/song-ocr-review-queue"
import { SongLibraryInspector } from "@/components/admin/song-library-inspector"
import { getCurrentAdmin, isAuthenticated } from "@/lib/clerk-auth"
import { redirect } from "next/navigation"

export default async function SongsAdminPage() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/sign-in?redirect_url=/admin/songs")
  }
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect("/admin")
  }

  return (
    <div className="admin-shell">
      <AdminNav currentPage="songs" admin={admin} />
      <main id="main-content" className="admin-main">
        <div className="admin-container space-y-8">
          <header className="admin-page-header">
            <h1 className="text-section-title text-balance">Songs</h1>
            <p className="text-lead text-muted-foreground">
              Browse the song book with PDF + lyrics JSON side by side. Search a
              page number to QA Text mode.
            </p>
          </header>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Library inspector
            </h2>
            <SongLibraryInspector />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Lyric OCR review
            </h2>
            <SongOcrReviewQueue canEdit={admin.role !== "viewer"} />
          </section>
          <SongPacksManager canEdit={admin.role !== "viewer"} />
        </div>
      </main>
    </div>
  )
}
