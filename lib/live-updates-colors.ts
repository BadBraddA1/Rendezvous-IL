/** Lake-teal / coral pin palette for the live-updates display board. */
export type LuPinColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink"

export type LuPinStyle = {
  hex: string
  icon: string
  text: string
  border: string
  surface: string
  glow: string
}

/** Legacy map color names → on-brand display tokens (coral, sand, lake teal). */
export const LU_PIN_COLORS: Record<LuPinColor, LuPinStyle> = {
  red: {
    hex: "#d97a62",
    icon: "lu-pin-coral",
    text: "lu-pin-coral-text",
    border: "lu-pin-coral-border",
    surface: "lu-pin-coral-surface",
    glow: "lu-pin-coral-glow",
  },
  orange: {
    hex: "#c4a76a",
    icon: "lu-pin-warm",
    text: "lu-pin-warm-text",
    border: "lu-pin-warm-border",
    surface: "lu-pin-warm-surface",
    glow: "lu-pin-warm-glow",
  },
  yellow: {
    hex: "#b8a040",
    icon: "lu-pin-highlight",
    text: "lu-pin-highlight-text",
    border: "lu-pin-highlight-border",
    surface: "lu-pin-highlight-surface",
    glow: "lu-pin-highlight-glow",
  },
  green: {
    hex: "#4a9a72",
    icon: "lu-pin-success",
    text: "lu-pin-success-text",
    border: "lu-pin-success-border",
    surface: "lu-pin-success-surface",
    glow: "lu-pin-success-glow",
  },
  blue: {
    hex: "#3da896",
    icon: "lu-pin-lake",
    text: "lu-pin-lake-text",
    border: "lu-pin-lake-border",
    surface: "lu-pin-lake-surface",
    glow: "lu-pin-lake-glow",
  },
  purple: {
    hex: "#5a8a96",
    icon: "lu-pin-ink",
    text: "lu-pin-ink-text",
    border: "lu-pin-ink-border",
    surface: "lu-pin-ink-surface",
    glow: "lu-pin-ink-glow",
  },
  pink: {
    hex: "#d97a62",
    icon: "lu-pin-coral",
    text: "lu-pin-coral-text",
    border: "lu-pin-coral-border",
    surface: "lu-pin-coral-surface",
    glow: "lu-pin-coral-glow",
  },
}

/** Map pin rendering on the venue photo (light markers on varied imagery). */
export const LU_MAP = {
  routeDefault: LU_PIN_COLORS.orange.hex,
  prevFill: LU_PIN_COLORS.purple.hex,
  prevStroke: LU_PIN_COLORS.blue.hex,
  labelOnPin: "#f8fcfb",
} as const

export function resolveLuPinColor(
  color: string | undefined,
  category?: string,
): LuPinColor {
  if (color && color in LU_PIN_COLORS) return color as LuPinColor
  if (category === "dining") return "orange"
  if (category === "meeting") return "red"
  if (category === "lodging") return "blue"
  return "purple"
}

export function luPinStyle(color: string | undefined, category?: string): LuPinStyle {
  return LU_PIN_COLORS[resolveLuPinColor(color, category)]
}

/** Map editor / venue pin swatches — on-brand lake-teal family, not Tailwind rainbow. */
export const MAP_PIN_LABELS: Record<LuPinColor, string> = {
  red: "Coral",
  orange: "Sand",
  yellow: "Gold",
  green: "Forest",
  blue: "Lake",
  purple: "Slate",
  pink: "Rose",
}

export const MAP_PIN_OPTIONS = (Object.keys(LU_PIN_COLORS) as LuPinColor[]).map((value) => ({
  value,
  label: MAP_PIN_LABELS[value],
  hex: LU_PIN_COLORS[value].hex,
}))

export function mapPinHex(color: string | undefined, category?: string): string {
  return LU_PIN_COLORS[resolveLuPinColor(color, category)].hex
}

/** Event icon semantic buckets (replaces rainbow Tailwind on the display board). */
export const LU_ICON = {
  warm: "lu-icon-warm",
  lake: "lu-icon-lake",
  muted: "lu-icon-muted",
  coral: "lu-icon-coral",
  now: "lu-text-now",
  schedule: "lu-text-schedule",
  meal: "lu-text-meal",
  upcoming: "lu-text-upcoming",
} as const
