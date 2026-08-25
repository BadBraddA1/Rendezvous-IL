import type { ReactNode } from "react"

/** Dense overview / list stat tile (Camp Ruby + LECYC). */
export function AdminStat({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="ad-stat">
      <p className="ad-stat-label">{label}</p>
      <p className="ad-stat-value">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--ad-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Full-width auto-fill grid for overview tiles. */
export function AdminStatStrip({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))" }}
    >
      {children}
    </div>
  )
}
