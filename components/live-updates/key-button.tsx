export function KeyButton({
  name,
  shortcut,
  active,
  onClick,
  ariaLabel,
}: {
  name: string
  shortcut?: string
  active?: boolean
  onClick?: () => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? name}
      aria-pressed={active}
      className={`inline-flex min-h-11 touch-target items-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-white/10 lu-text-body hover:bg-white/20"
      }`}
    >
      {shortcut ? (
        <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-xs opacity-80">
          {shortcut}
        </kbd>
      ) : null}
      {name}
    </button>
  )
}
