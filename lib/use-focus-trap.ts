import { useEffect, type RefObject } from "react"

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onEscape?: () => void,
) {
  useEffect(() => {
    if (!active) return

    const previousFocus = document.activeElement as HTMLElement | null

    const getFocusables = () =>
      Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    const frame = requestAnimationFrame(() => {
      getFocusables()[0]?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape?.()
        return
      }
      if (event.key !== "Tab") return

      const focusables = getFocusables()
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus()
    }
  }, [active, containerRef, onEscape])
}
