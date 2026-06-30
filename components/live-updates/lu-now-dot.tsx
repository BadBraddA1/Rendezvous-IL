export function LuNowDot({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"
  return (
    <span
      className={`inline-flex shrink-0 rounded-full lu-bg-now ${sizeClass}`}
      aria-hidden="true"
    />
  )
}
