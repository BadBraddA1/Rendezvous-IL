---
name: Rendezvous IL
description: Joyful, family-rooted public site for a Christian homeschool family retreat
colors:
  background: "#f8f9fb"
  foreground: "#1a2332"
  primary: "#3aab9a"
  primary-foreground: "#f5fdfb"
  secondary: "#eef1f5"
  muted: "#eef1f5"
  muted-foreground: "#5c6573"
  accent: "#2d9488"
  border: "#dde2ea"
  destructive: "#c44d2e"
  card: "#ffffff"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
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

Mood: joyful, unhurried, trustworthy. Prospective families should feel they can picture kids on the lawn, parents in conversation, and a week with room to breathe. Visual identity leans on the existing Rendezvous logo (warm coral/teal palette), lake-and-woods photography, and readable Geist typography. Avoid v0-era motion excess (blur reveals, gradient text, spring bounce).

Layout: mobile-first, generous vertical rhythm, container `px-6`, sections that alternate plain background and subtle tint—not identical card grids.

## Colors

Canonical tokens live in `app/globals.css` (OKLCH). Frontmatter hex values are sRGB approximations for tooling.

| Role | OKLCH (source) | Character |
|------|----------------|-----------|
| Background | `oklch(0.98 0.005 250)` | Cool near-white — **candidate to deepen** away from generic cream |
| Foreground | `oklch(0.20 0.02 250)` | Ink navy for body headings |
| Primary | `oklch(0.60 0.12 175)` | Lake teal — CTAs, links, icons |
| Accent | `oklch(0.55 0.10 180)` | Deeper teal for emphasis |
| Muted text | `oklch(0.45 0.02 250)` | Supporting copy — verify ≥4.5:1 on background |
| Destructive | `oklch(0.55 0.22 25)` | Errors, sign-out affordances |

Logo gradient colors (hero heritage): coral `#e07860`, sand `#c9b49c`, teal `#5ec8b4` — use in **imagery and borders**, not gradient text.

Dark mode tokens exist (`.dark`) but no ThemeProvider is wired; treat light mode as production default until explicitly enabled.

## Typography

- **Sans (UI + display):** Geist — loaded in `app/layout.tsx`. Use weight contrast (400 body, 600–800 headings), not novelty display fonts.
- **Handwriting accent:** Dancing Script (`--font-handwriting`) — sparingly for human touches only.
- **Display scale:** Hero year line capped at `clamp` max **6rem** (96px). Current `12rem` implementation is **out of spec**.
- **Prose:** `text-wrap: balance` on h1–h3; `text-wrap: pretty` on long paragraphs.
- **Line length:** Cap body copy ~65–75ch in text-heavy pages (About, FAQ, Privacy).

## Elevation

Mostly **flat + border**. Cards use `border-border/50`, soft `shadow-primary/5` on hover—not heavy drop shadows. Avoid decorative glassmorphism (`backdrop-blur` on badges/overlays) except rare purposeful overlays.

Shadow vocabulary:
- `shadow-lg shadow-primary/5` — featured media blocks
- `shadow-2xl` — play button on video (use sparingly)

## Components

**Site chrome**
- `SiteHeader` — fixed; on homepage starts minimal (hamburger only) until scroll; elsewhere full nav
- `SiteFooter` — centered contact, privacy link, BraddCorp credit

**Marketing patterns**
- `HeroSection` — full viewport, logo, year, theme, tagline rotation, CTAs
- `RegistrationCountdown2027` — registration opens Jan 1, 2027
- Feature blocks on home — currently 4-up Card grid (**known anti-pattern**; refactor to varied rhythm)

**shadcn/ui** — `components/ui/*` for buttons, cards, sheets, dialogs. Prefer token classes (`bg-primary`, `text-muted-foreground`) over raw Tailwind palette (`blue-50`, `violet-300`).

**Admin** (`app/admin/*`) — product-register UI; data tables, stat cards, Clerk-gated nav. Keep functional; don't apply marketing hero patterns.

## Do's and Don'ts

**Do**
- Use OKLCH tokens from `globals.css`
- Lead with real photos (retreat, Lake Williamson, families)
- Keep CTAs large (`h-14`) and full-width on mobile
- Respect `prefers-reduced-motion` on all custom animations
- Show content visible by default; animate as enhancement

**Don't**
- Gradient text (`bg-clip-text`) — banned
- Identical icon+card grids for every section
- Spring/bounce easing (`cubic-bezier(0.34, 1.56, …)`, `animate-bounce`)
- Cartoon camp aesthetics (rainbow, novelty fonts, clip art)
- Hide navigation until scroll on homepage without a skip link
- Hard-code Tailwind color scales on public pages when tokens exist
