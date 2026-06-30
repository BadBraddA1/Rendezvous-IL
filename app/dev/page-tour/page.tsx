import { Suspense } from "react"
import PageTourLauncherPage from "./page-tour-client"

export default function PageTourPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
          Loading page tour…
        </main>
      }
    >
      <PageTourLauncherPage />
    </Suspense>
  )
}
