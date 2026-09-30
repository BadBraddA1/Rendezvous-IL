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
      className={`touch-target inline-flex min-h-12 items-center gap-2.5 rounded-lg border-2 px-4 py-2.5 text-base font-bold transition-colors ${
        active
          ? "border-[#7fe0d0] bg-[#7fe0d0] text-[#05080a]"
          : "border-white/55 bg-[#243036] text-white hover:bg-[#2e3c42]"
      }`}
    >
      {shortcut ? (
        <kbd
          className={`inline-flex min-w-7 items-center justify-center rounded-md border-2 px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${
            active
              ? "border-[#05080a]/40 bg-white text-[#05080a]"
              : "border-white/55 bg-[#05080a] text-white"
          }`}
        >
          {shortcut}
        </kbd>
      ) : null}
      {name}
    </button>
  )
}
