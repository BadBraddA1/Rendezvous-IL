export function ViewLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-live="polite" aria-busy="true">
      <p className="lu-text-muted text-xl">Loading view…</p>
    </div>
  )
}
