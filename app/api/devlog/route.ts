import { NextResponse } from "next/server"

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? "BadBraddA1"
const GITHUB_REPO = process.env.GITHUB_REPO ?? "Rendezvous-IL"

export async function GET() {
  const token = process.env.GITHUB_TOKEN

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
    {
      headers,
      next: { revalidate: 300 }, // cache for 5 minutes
    },
  )

  if (!res.ok) {
    return NextResponse.json(
      { error: `GitHub API error: ${res.status} ${res.statusText}` },
      { status: res.status },
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
