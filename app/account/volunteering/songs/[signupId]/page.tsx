import { currentUser } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { resolveFamilyForUser } from "@/lib/family-auth"
import { assertFamilyCanSubmitWorshipSongs } from "@/lib/worship-song-submissions"
import { WorshipSongSetEditor } from "@/components/account/worship-song-set-editor"
import { parseRegistrationEventYear } from "@/lib/registration-event-years"

type PageProps = {
  params: Promise<{ signupId: string }>
  searchParams: Promise<{ year?: string }>
}

export default async function WorshipSongSetPage({ params, searchParams }: PageProps) {
  const user = await currentUser()
  if (!user) {
    const { signupId } = await params
    const sp = await searchParams
    const qs = sp.year ? `?year=${sp.year}` : ""
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/account/volunteering/songs/${signupId}${qs}`)}`,
    )
  }

  const { signupId: raw } = await params
  const signupId = Number(raw)
  if (!Number.isFinite(signupId) || signupId <= 0) notFound()

  const sp = await searchParams
  const year = parseRegistrationEventYear(sp.year ?? null)
  const userEmail =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress

  const family = await resolveFamilyForUser(user.id, userEmail)
  if (!family) {
    redirect("/account")
  }

  try {
    await assertFamilyCanSubmitWorshipSongs(family, signupId, String(year))
  } catch {
    notFound()
  }

  return (
    <main id="main-content" className="site-container site-below-header py-8">
      <div className="mx-auto max-w-xl space-y-4">
        <header>
          <p className="text-sm text-muted-foreground">
            <Link href="/account" className="underline-offset-2 hover:underline">
              Account
            </Link>{" "}
            · Volunteering
          </p>
          <h1 className="text-section-title text-balance">Songs for this service</h1>
        </header>
        <WorshipSongSetEditor signupId={signupId} eventYear={year} />
      </div>
    </main>
  )
}
