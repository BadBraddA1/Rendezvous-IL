import { Button } from "@/components/ui/button"

export function AdminPanelSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-2" role="status" aria-live="polite">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="h-8 w-20 rounded bg-muted" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function AdminChartSkeleton({ label = "Loading chart" }: { label?: string }) {
  return (
    <div
      className="h-[300px] animate-pulse rounded-lg bg-muted/40"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function AdminListSkeleton({
  rows = 4,
  label = "Loading list",
}: {
  rows?: number
  label?: string
}) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-2 border-b border-border/60 pb-4 last:border-0">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-56 max-w-full rounded bg-muted" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function AdminRetryButton({
  onRetry,
  label = "Try again",
}: {
  onRetry: () => void
  label?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="touch-target-coarse mt-3 min-h-11"
      onClick={onRetry}
    >
      {label}
    </Button>
  )
}

export function AdminTableSkeleton({
  columns = 5,
  rows = 5,
  label = "Loading table",
}: {
  columns?: number
  rows?: number
  label?: string
}) {
  return (
    <div className="space-y-3 py-1" role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-8 animate-pulse rounded bg-muted ${colIndex === 0 ? "w-24 shrink-0" : "flex-1"}`}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
