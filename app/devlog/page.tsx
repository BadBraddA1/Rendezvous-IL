import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { DevlogClient, type PullRequest } from "./DevlogClient"
import { GitPullRequest } from "lucide-react"

const GITHUB_OWNER = "BadBraddA1"
const GITHUB_REPO = "Rendezvous-IL"

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
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="border-b bg-secondary py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-secondary-foreground">
                <GitPullRequest className="h-4 w-4" />
                Powered by GitHub
              </div>
              <h1 className="mb-4 text-balance text-5xl font-bold tracking-tight text-secondary-foreground md:text-6xl">
                Dev Log
              </h1>
              <p className="text-balance text-lg text-secondary-foreground/70">
                A transparent record of development activity for this project. View merged features, open work, and the
                full history of changes.
              </p>

              {pullRequests.length > 0 && (
                <div className="mt-8 flex flex-wrap justify-center gap-6">
                  <div className="rounded-xl border border-secondary-foreground/20 bg-secondary-foreground/10 px-6 py-3 text-center backdrop-blur-sm">
                    <p className="text-3xl font-bold text-secondary-foreground">{mergedCount}</p>
                    <p className="text-sm text-secondary-foreground/70">Merged</p>
                  </div>
                  <div className="rounded-xl border border-secondary-foreground/20 bg-secondary-foreground/10 px-6 py-3 text-center backdrop-blur-sm">
                    <p className="text-3xl font-bold text-secondary-foreground">{openCount}</p>
                    <p className="text-sm text-secondary-foreground/70">Open</p>
                  </div>
                  <div className="rounded-xl border border-secondary-foreground/20 bg-secondary-foreground/10 px-6 py-3 text-center backdrop-blur-sm">
                    <p className="text-3xl font-bold text-secondary-foreground">{pullRequests.length}</p>
                    <p className="text-sm text-secondary-foreground/70">Total PRs</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl">
              {pullRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed py-24 text-center">
                  <GitPullRequest className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-lg font-medium text-muted-foreground">No pull requests found</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Add a{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">GITHUB_TOKEN</code> environment
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
