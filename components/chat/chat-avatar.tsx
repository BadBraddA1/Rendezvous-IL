"use client"

type ChatAvatarProps = {
  name: string
  url?: string | null
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
}

export function ChatAvatar({ name, url, className }: ChatAvatarProps) {
  return (
    <div className={["bc-chat__avatar", className].filter(Boolean).join(" ")} aria-hidden>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        initials(name)
      )}
    </div>
  )
}
