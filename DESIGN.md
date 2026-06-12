---
name: Rendezvous IL
description: Joyful, family-rooted public site for a Christian homeschool family retreat
colors:
  background: "#f7faf9"
  foreground: "#1a2e32"
  primary: "#2fa894"
  primary-foreground: "#f8fcfb"
  secondary: "#e8f2f0"
  muted: "#e8f2f0"
  muted-foreground: "#4d5f66"
  accent: "#268f84"
  border: "#cdded9"
  destructive: "#c44d2e"
  card: "#fdfffe"
  brand-coral: "#d97a62"
  surface-lake: "#d4ebe6"
typography:
  display:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.25vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Libre Franklin, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  handwriting:
    fontFamily: "Dancing Script, cursive"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "14px 40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "14px 40px"
  card-surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System

## Overview

**Creative north star:** *The Lakeside Gathering* — an established Christian camp welcome, not a theme-park brochure.

Mood: joyful, unhurried, trustworthy. Prospective families should feel they can picture kids on the lawn, parents in conversation, and a week with room to breathe. Visual identity leans on the existing Rendezvous logo (warm coral/teal palette), lake-and-woods photography, and Libre Baskerville + Libre Franklin typography. Avoid v0-era motion excess (blur reveals, gradient text, spring bounce).

Layout: mobile-first, generous vertical rhythm, container `px-6`, sections that alternate plain background and subtle tint—not identical card grids.

## Colors

Canonical tokens live in `app/globals.css` (OKLCH). Frontmatter hex values are sRGB approximations for tooling.

| Role | OKLCH (source) | Character |
|------|----------------|-----------|
| Background | `oklch(0.985 0.009 178)` | Lake mist — teal-tinted neutrals, not blue-gray |
| Foreground | `oklch(0.22 0.035 195)` | Deep lake ink |
| Primary | `oklch(0.58 0.13 175)` | Lake teal — CTAs, links, icons |
| Accent | `oklch(0.52 0.11 180)` | Deeper teal for emphasis |
| Muted text | `oklch(0.42 0.03 195)` | Supporting copy — ≥4.5:1 on background |
| Destructive | `oklch(0.55 0.22 25)` | Errors, sign-out affordances |
| Brand coral | `oklch(0.65 0.14 38)` | Logo warmth — sparse accent (theme line, highlights) |
| Surface lake | `oklch(0.91 0.05 175)` | Committed CTA / registration-open bands |

**Color strategy:** Committed lake teal on neutrals and section washes; coral at ~10% for heritage moments. Surfaces: `surface-tint`, `surface-highlight`, `surface-lake`, `surface-warm` in `globals.css`.

Dark mode tokens exist (`.dark`) but no ThemeProvider is wired; treat light mode as production default until explicitly enabled.

## Typography

- **Display (headings):** Libre Baskerville — `font-display`, weights 400/700. Section titles via `.text-section-title`, page titles via `.text-page-title`.
- **Sans (UI + body):** Libre Franklin — `font-sans`, weights 400/500/600. Loaded in `app/layout.tsx` with `display: swap`.
- **Mono (data):** Source Code Pro — countdown digits, WiFi credentials; use `.tabular-nums`.
- **Handwriting accent:** Dancing Script (`font-handwriting`) — sparingly (e.g. About page sign-off).
- **Scale:** Major third (~1.25) tokens in `:root`; fluid `clamp()` for section/page titles only; body fixed at `1rem`.
- **Prose:** `text-wrap: balance` on headings; `text-wrap: pretty` on paragraphs; `.measure-prose` caps at **65ch**.
- **Muted text:** `oklch(0.42 0.03 195)` — tuned for ≥4.5:1 on background.
- **On tinted surfaces:** `--on-surface` / `.text-on-surface` for body copy on `surface-lake` and similar washes (never gray-muted on color).
- **Semantic:** `--success`, `--warning`, `--brand-coral-ink` (accessible coral text).

## Elevation

Mostly **flat + border**. Cards use `border-border/50`, soft `shadow-primary/5` on hover—not heavy drop shadows. Avoid decorative glassmorphism (`backdrop-blur` on badges/overlays) except rare purposeful overlays.

Shadow vocabulary:
- `shadow-lg shadow-primary/5` — featured media blocks
- `shadow-2xl` — play button on video (use sparingly)

## Components

**Site chrome**
- `SiteHeader` — fixed; always visible (logo + nav). Homepage uses translucent bar at top, solid on scroll.
- Skip link — `.skip-link` in root layout targets `#main-content`
- Section spacing — `.section-sm` / `.section` / `.section-lg` fluid tokens in `globals.css`
- Responsive — `viewport-fit: cover`, `.site-container` (safe-area padding), `.hero-viewport` (`100dvh`), 44px touch targets, countdown `grid-cols-4` on narrow screens
- `SiteFooter` — centered contact, privacy link, BraddCorp credit

**Marketing patterns**
- `HeroSection` — full viewport, logo, year, theme, tagline rotation, CTAs
- `RegistrationCountdown2027` — registration opens Jan 1, 2027
- Homepage retreat facts — semantic `<dl>` grid (no glass cards)
- “What to expect” — asymmetric 12-col bento (featured Bible Bowl + stacked lodging/WiFi + recreation/dining row)
- Planning 2027 — divided list, not identical stat boxes

**shadcn/ui** — `components/ui/*` for buttons, cards, sheets, dialogs. Prefer token classes (`bg-primary`, `text-muted-foreground`) over raw Tailwind palette (`blue-50`, `violet-300`).

**Admin** (`app/admin/*`) — product-register UI; data tables, stat cards, Clerk-gated nav. Keep functional; don't apply marketing hero patterns.

## Do's and Don'ts

**Do**
- Use OKLCH tokens from `globals.css`
- Lead with real photos (retreat, Lake Williamson, families)
- Keep CTAs large (`h-14`) and full-width on mobile
- Respect `prefers-reduced-motion` on all custom animations (global reduce block in `globals.css`)
- Show content visible by default; animate as enhancement (`.hero-motion-ready` staggers on homepage hero)

**Don't**
- Gradient text (`bg-clip-text`) — banned
- Identical icon+card grids for every section
- Spring/bounce easing (`cubic-bezier(0.34, 1.56, …)`, `animate-bounce`) — removed from hero, schedule map pins, and view transitions
- Cartoon camp aesthetics (rainbow, novelty fonts, clip art)
- Hide primary navigation on homepage (use skip link + always-visible header instead)
- Hard-code Tailwind color scales on public pages when tokens exist
