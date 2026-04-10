import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { DevlogClient, type PullRequest } from "./DevlogClient"
import { GitPullRequest } from "lucide-react"

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "BadBraddA1"
const GITHUB_REPO = process.env.GITHUB_REPO ?? "Rendezvous-IL"

async function fetchPullRequests(): Promise<PullRequest[]> {
  const token = process.env.GITHUB_TOKEN

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
      {
        headers,
        next: { revalidate: 300 }, // cache for 5 minutes
      },
    )

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status} ${res.statusText}`)
      return []
    }

    return res.json()
  } catch (err) {
    console.error("Failed to fetch pull requests:", err)
    return []
  }
}

export default async function DevlogPage() {
  const pullRequests = await fetchPullRequests()

  const mergedCount = pullRequests.filter((pr) => pr.merged_at).length
  const openCount = pullRequests.filter((pr) => pr.state === "open").length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b bg-gradient-to-b from-primary/5 to-background py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <GitPullRequest className="h-4 w-4" />
                Powered By BraddCorp
              </div>
              <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Dev Log
              </h1>
              <p className="text-lg text-muted-foreground">
                A transparent record of development activity for this project. View merged features, open work, and the
                full history of changes.
              </p>

              {pullRequests.length > 0 && (
                <div className="mt-8 flex items-center justify-center gap-8 text-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">{mergedCount}</span>
                    <span className="text-muted-foreground">Merged</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-chart-2">{openCount}</span>
                    <span className="text-muted-foreground">Open</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-foreground">{pullRequests.length}</span>
                    <span className="text-muted-foreground">Total PRs</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl">
              {pullRequests.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-lg font-medium">No pull requests found</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add a{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GITHUB_TOKEN</code> environment
                    variable to enable GitHub API access.
                  </p>
                </div>
              ) : (
                <DevlogClient pullRequests={pullRequests} />
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
