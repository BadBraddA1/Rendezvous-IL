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
      className={`touch-target inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "border-2 border-white/40 bg-[#243036] lu-text-body hover:bg-[#2e3c42]"
      }`}
    >
      {shortcut ? (
        <kbd className="rounded border-2 border-white/40 bg-[#1a2428] px-1.5 py-0.5 font-mono text-xs">
          {shortcut}
        </kbd>
      ) : null}
      {name}
    </button>
  )
}
