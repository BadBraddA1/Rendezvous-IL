# Rendezvous IL Website

Production site for the Rendezvous Christian Homeschool Family Retreat — [rendezvousil.com](https://rendezvousil.com).

Handles public event pages, family registration (2027), admin dashboard (registrations, meals, check-in, messaging), and Clerk-based family accounts.

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Turso** (libSQL / SQLite) — all app data via `lib/db.ts` and `@libsql/client`
- **Clerk** — authentication (families + admin roles)
- **Resend** — email
- **Vercel** — hosting (project: `v0-ren`)

## Environment variables

Required on Vercel (`v0-ren`):

| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | Turso libsql URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (client) |
| `CLERK_SECRET_KEY` | Clerk (server) |
| `JWT_SECRET`, `ADMIN_SECRET`, `ADMIN_SETUP_KEY` | Admin auth |
| `RESEND_API_KEY` | Email |

Full list and legacy cleanup notes: [docs/TURSO_SETUP.md](docs/TURSO_SETUP.md)

## Local development

```bash
git clone https://github.com/BadBraddA1/Rendezvous-IL.git
cd Rendezvous-IL
pnpm install
vercel link --project v0-ren
vercel env pull .env.local --environment=production
pnpm dev
```

Verify database connectivity:

```bash
pnpm db:verify
```

## Database

- Schema: `scripts/schema-turso.sql`
- All queries: `import { sql } from "@/lib/db"`
- Migrated from Neon Postgres to Turso (one-time script archived in `scripts/archive/`)
- Key tables: `families`, `family_members_v2`, `registrations`, `pending_family_changes`

## Family accounts (`/account/profile`)

- Clerk users are linked to a `families` row by `clerk_user_id` or matching registration email (auto-linked on first visit).
- Profile edits do **not** write directly to Turso — they queue rows in `pending_family_changes` for admin approval at `/admin/pending-changes`.
- Member type / age group: adults and teens skip the age-group picker; children with a registration birthday get age group auto-calculated (`lib/member-age.ts`).
- Admin roles: `admin`, `editor`, `viewer`, and **`checkin`** (check-in station only — web + iOS). Permissions live in `lib/clerk-auth.ts` (`getAdminPermissions`).
- API: `GET/PUT /api/family/profile`, `POST/DELETE /api/family/members`

## Family directory (`/directory`)

- Registered families can upload a photo and short blurb from `/account/profile`; listings appear at `/directory` for the same event year.
- **Listing is on by default** for registered families (`directory_opt_in`); families opt out from profile if they do not want to appear. Photos are optional — families without a photo still show name, congregation, and attendees.
- **Year visibility** is controlled on the admin dashboard (`/admin`) — toggles per year in `app_settings` (`directory_enabled_2026`, `directory_enabled_2027`). Defaults: **2026 on**, **2027 off** until registration opens.
- Public API: `GET /api/directory/years` returns enabled years; `GET /api/directory?year=` requires sign-in + registration for that year (admins can preview disabled years).
- Admin API: `GET/POST /api/admin/directory/status` (POST requires `admin` role).
- iOS: `DirectoryView` and `FamilyDirectoryManageView` in `ios/RendezvousIL/`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm db:verify` | List Turso tables and row counts |

**Localhost page tour:** open [`/dev/page-tour`](http://localhost:3000/dev/page-tour) during `pnpm dev` to auto-cycle routes with a countdown bar (2s default) — for fast header/layout QA. Keyboard: Space pause, ←/→ step, Esc stop.

## Design & motion

Brand and UI context: `PRODUCT.md`, `DESIGN.md`. **Header clearance:** fixed `SiteHeader` uses `--site-header-height` (4rem mobile / 4.5rem md) + `--site-header-gap` (2rem / 1.5rem) + safe-area. Apply `.site-below-header` or `.site-below-header-loose` on `<main>` / first section; `.site-page-intro` for icon rows; `.site-sticky-top` / `.site-scroll-mt` for sticky nav and anchors. Marketing shells (calculator, privacy, registration, scrabble-rules, account, map2026 gates) standardize on `site-below-header-loose` — not `section-sm` or `flex-1` centering on short pages; `/map2026` inner sections use `site-container`. Homepage hero uses `justify-start` so tall content cannot slide under the nav. **Polish + adapt pass:** admin surfaces share `admin-toolbar` / `admin-toolbar-action` responsive toolbars (full-width actions on phones), `AdminTableSkeleton` + fetch error/retry on announcements; feedback labels drop uppercase eyebrows; registration edit modal stacks footer actions on narrow screens; checked-in table hides non-essential columns on mobile with inline check-in time; map attendee list uses `content-visibility`. **Optimize pass:** `/map2026` lazy-loads the static registration dataset (`lib/map2026-registrations-data.ts`) after unlock and defers family-member API calls until then; Leaflet chunk gets a loading skeleton; `fetchJsonCached` dedupes map family-member, schedule announcement, and live-updates meal/volunteer polls; `now-next-schedule` ticks every 30s instead of 1s (minute-granularity slots). **Harden pass:** all admin `confirm()` dialogs replaced with `AdminConfirmDialog` (registrations table, edit modal, check-in station, checked-in table, announcements, meals, messaging); registrations table gets debounced search, typed rows, fetch error + retry, accessible checkboxes/icon actions, and overflow-safe name/email cells. **Polish pass (3):** semantic z-index tokens (`--z-raised` … `--z-skip-link`) and `.z-layer-*` utilities replace arbitrary Tailwind z-classes site-wide; registration test debug `console.log` removed. **Polish pass:** shared admin loading skeletons + retry actions (`admin-panel-states.tsx`) replace generic “Loading…” copy across dashboard stats, payment status, recent registrations, and analytics; admin map + error boundary use `callout-destructive` with reload affordances; schedule map legend/category tokens fixed for `activities` + `recreation`; registration review Edit buttons get section-specific `aria-label`s and reduced-motion error scroll. **Optimize pass:** `/schedule` batches week data in `ScheduleDataProvider` (3 requests instead of ~30+ on load: all meals, volunteer week range, one weather fetch); `lib/fetch-json-cache.ts` dedupes identical GETs; `ScheduleMap` lazy-loads via `next/dynamic` when the modal opens; meal/volunteer/inline-weather widgets read shared context with per-widget fallback; day sections use `content-visibility: auto`; `GET /api/volunteer-schedule?from=&to=` returns a week map for batch loading. **Clarify pass:** hero and `/eod` h1 include sr-only “Rendezvous” for screen readers; Bible Bowl copy names the 2027 study book; registration review/success/error copy is action-specific (“Submit registration”, “Try submitting again”, save-your-ID guidance); wizard nav uses “Continue to …” / “Back to …”; confirmation step wires Edit + back from test flow; notify/signup forms use visible labels, `you@example.com` placeholders, and format-specific validation; open-registration CTA pre-fills mailto subject; live-updates header reads “Live updates · Rendezvous 2027”. **Colorize pass (2):** admin API emails (magic link, bulk registration, messaging broadcast) share `EMAIL_BRAND` shell via `lib/email-templates.tsx`; admin analytics charts use `CHART_COLORS` lake-teal palette (no Recharts purple default); admin error cards use `callout-destructive`; admin registration map markers use coral/lake teal; map editor pin swatches and path preview use `MAP_PIN_OPTIONS` / `LU_PIN_COLORS` (not Tailwind rainbow); `components/ui/map` default marker is brand primary; `--chart-5` shifted to coral hue. **Harden pass:** registration submit replaces `alert()` with inline destructive `Alert`, status-aware copy via `lib/registration-submit-error.ts`, safe JSON parsing, retry button, and scroll/focus to the error; family-member removal uses `AlertDialog` instead of `window.confirm`; notify-email form distinguishes validation/error/success with `role="alert"` / `aria-live`; review step adds `min-w-0` + `break-words` on long names, emails, addresses, and notes. **Colorize pass (3):** admin stat strips use lake-tinted `surface-tint` border/background; dashboard lodging/payment icons restrained to muted (semantic color on balance-due text only); payment-status icons muted; feedback quote blocks use `surface-tint`; toast destructive close uses semantic tokens.
 **Polish pass (5):** `/silent` single `h1` (chrome label demoted to `<p>`; sr-only h1 when timer active); `brand-dark-*` text utilities replace inline OKLCH; admin gate `CardTitle` → `text-subheading` site-wide; profile debug `console.log` removed; `/map2026` retry buttons `min-h-11`; slider thumb uses `bg-background`. `.admin-gate-screen` unifies sign-in/denied gates; `.admin-action-row` for dashboard action links (44px targets); quick actions use `admin-toolbar`; card section titles use `text-widget-heading`; site metadata uses ASCII hyphens instead of em dashes. admin metric card grids replaced with flat `.admin-stat-strip` (`AdminStatStrip` / `AdminStatItem`) on dashboard, feedback, checked-in, and `DashboardStats`; page-tour footer drops `backdrop-blur`; feedback star uses `text-warning`; dashboard lodging icons muted. admin routes share `.admin-shell` / `.admin-main` / `.admin-container` (safe-area padding, 80rem max, 1.5rem section gap); narrow forms use `.admin-container--narrow`, check-in uses `--compact`; page intros use `.admin-page-header`; `/messaging` uses `site-container` + `belowHeader="loose"`. Replaces mixed `container mx-auto` / `px-4 py-8` patterns. admin + dev routes drop raw `text-2xl`/`text-3xl` page titles for `text-section-title` + `text-lead`; `/messaging` fixes missing `h1`; gate cards use `text-subheading`; dashboard/metric numbers use `text-amount` (admin home, calculators, feedback/checked-in tables, dashboard-stats, payment card); `/silent` and schedule print aligned to the scale. `/EEF`, account, sign-in/up, scrabble word-list sections, map-editor, and map2026 gate cards use `text-page-title` / `text-section-title` / `text-lead` (no raw Tailwind `text-2xl`/`text-3xl` on public routes); hero year/eod display use committed `hero-year` / `text-display-hero` clamps; taglines use `text-lead` + `measure`; registration review cards and dollar totals use display/sans scale tokens; schedule event times `font-medium`; LU map/all views use `lu-type-board-*` instead of raw Tailwind sizes. **Quieter pass (2):** hero date pill drops live-style dot; schedule “Next Up” removes fake Live badge and softens now/next card borders; day nav uses `ring-1` not `ring-2`; back-to-top is outline card style not saturated FAB; form sticky bar is flat (no blur); LU map pin halos/glow utilities suppressed; zoom footer and auto-rotate label toned down; install/map2026 cards lose heavy shadows. **Adapt pass (3):** `/EEF` + `/registration-test2026` use `site-container` safe-area padding; EEF step rail is `scroll-touch-x` with 44px targets; EEF + registration test sticky prev/next use `form-sticky-actions` with full-width `min-h-11` buttons on phones; sign-in/up respect home-indicator inset. **Adapt pass (4):** page-tour overlay controls use `size="icon"` + `.touch-target` (44px); dev page-tour interval pills `min-h-11`; admin mobile nav + global `Table` wrapper + about attendance table use `.scroll-touch-x`; admin map and `/map2026` map/list heights use `dvh` instead of `vh`; `/silent` uses `min-h-dvh` and safe-area on header/footer; admin calculator + rates active-chart actions `min-h-11`. **Colorize pass (4):** `.countdown-digit-cell` lake-tinted wells shared by registration open grid, event countdown, weather hourly, and closing countdown; `registration-countdown` uses semantic `surface-warm` + `text-warning` (drops misused `text-ring`); weather current temp `text-amount` + primary; schedule preview rows `surface-tint`; now/next headings `text-primary`; registration popup + Bible Bowl + `/eod` heritage line uses `text-brand-coral-ink`; FAQ video cards hover tint; calculator coming-soon card header `surface-tint`. **Typeset pass (3):** `.text-timer-mono` for `/silent` countdown; raw `text-2xl`/`text-3xl`/`text-lg font-bold` replaced with scale utilities (`text-section-title`, `text-subheading`, `text-widget-heading`, `text-amount`, `text-day-title`) across calculators, install, map2026, account, admin dashboard inline stats, confirmation totals, schedule print, check-in station, footer sign-off, and dev page-tour cards. **Adapt pass:** `Button` `sm` size is 44px; `.form-sticky-actions` keeps registration prev/next pinned above the home indicator on phones; mobile nav sheet and live-updates footer respect safe-area insets; LU main scrolls on narrow viewports; map view event panel scrolls instead of clipping; date-picker day cells are 44px; lodging cards use `active:` feedback for touch. **Colorize pass (3):** `/registration-test2026` drops raw `bg-white`/`bg-gray-*`; debug output uses `surface-highlight` / `callout-destructive`, `bg-muted` code blocks, and semantic status dots; progress band and step pills use lake-tinted surfaces + `text-primary` for the active step label. **Colorize pass:** registration confirmation + admin notification emails use `EMAIL_BRAND` lake-teal/coral sRGB tokens (no orange/blue gradients); Venmo CTA uses `bg-primary`; registration step cards, admin calculator summary, schedule now/next widgets, geocode panels, and `/eod` drop `bg-gradient-to-br` washes for flat `surface-highlight` / `surface-lake` / `surface-warm`; live-updates map pins and route defaults use `LU_MAP` from `lib/live-updates-colors.ts`. **Polish pass:** admin calculator icon buttons labeled; registration-open band uses `text-on-surface` on `surface-lake`; LU footer `KeyButton`s are tappable (44px) with `aria-pressed`; raw `text-white` on projection board replaced with `lu-text-body`; schedule widget labels sentence-case. lake-teal OKLCH palette, Libre Baskerville + Libre Franklin, mobile safe-areas, accessible focus rings, semantic success/warning tokens. **Quieter pass:** hero uses flat background and static 2027 (no digit wave or live ping); taglines cycle slower with gentler fade; registration countdown drops per-second scale ticks; expect panels lose hover lift/ring; FAQ video grid loses tilt/hover bounce; schedule map pins use static highlight instead of pulse; live-updates view changes are a 320ms opacity crossfade only (no random blur/flip/glitch); live indicators use static dots. **Distill pass:** homepage drops the redundant fellowship CTA block and section subtitles that repeated the hero; final CTA is headline + buttons only. **`/live-updates`:** removed legacy `?admin=1` / ice-cream admin mode; All view no longer repeats the header logo (featured event is full-width); Schedule view no longer accepts unused upcoming props; footer drops keyboard-hint copy and uses a generic “Size” zoom label; stale ambient-glow comment placeholders removed from projection views. **Type scale:** major-third tokens in `globals.css` (`--text-base` through `--text-display`, `--text-day-title`); utilities `.text-page-title`, `.text-section-title`, `.text-display-hero`, `.text-day-title`, `.measure-prose`. **`/live-updates` projection type:** `.lu-type-feature`, `.lu-type-board-*`, `.lu-type-display`, `.lu-type-menu-*`, `.lu-type-credential`, `.lu-type-label*` — fluid clamps tuned for dark projection boards (looser `--lu-leading-body: 1.55`, bounded display sizes). **Skip link:** `#main-content` on every route landmark — use `components/main-content.tsx` or `id="main-content"` on layout `<main>`. **Semantic color:** `--success`, `--warning`, `--info`, `--destructive` plus `.callout-success` / `.callout-warning` / `.callout-info` / `.callout-destructive` for admin and registration status surfaces. Admin charts use `--chart-1`…`--chart-5` instead of rainbow Tailwind. **`/live-updates`:** `.lu-text-body` / `.lu-text-secondary` / `.lu-text-muted` / `.lu-text-subtle` replace raw `text-white/40–85` on the dark projection board; map view stacks event panel above venue map below `xl`; header/footer padding scales down on narrow viewports. **Live Updates performance:** shell in `components/live-updates/live-updates-shell.tsx`; header clock isolated in `live-updates-clock.tsx` (1s tick does not re-render views); schedule snapshot derived via `useMemo` on a minute bucket (not every second); nine projection views lazy-loaded via `next/dynamic` (`components/live-updates/lazy-views.tsx`) with idle prefetch for auto-rotate; shared helpers in `lib/live-updates/`. **Responsive / touch:** default `Input` and `Select` are 44px tall; `.touch-target` / `.touch-target-coarse` utilities; admin mobile nav and geocode/map-editor tool rows use icon buttons with `aria-label`; map-editor sidebar stacks above the canvas on phones (`flex-col lg:flex-row`, `100dvh`). **Hero motion:** `.hero-tagline` crossfade only (8s cycle); `Button` press scale respects `prefers-reduced-motion`. **Icon buttons:** registration, account profile, map tools, and admin actions use `aria-label`; default `Button` `size="icon"` is 44×44px. **Mux video:** `components/mux-video-player.tsx` — one-tap iOS playback, captions off by default; FAQ section + accordion item explain iOS Settings override; FAQ uses `deferPlayer`; homepage dynamically imports player with idle preload. **Social sharing:** `app/opengraph-image.tsx` + `app/twitter-image.tsx` (1200×630). **`/live-updates`:** lake-teal `.lu-panel` display board; map pins, weather, schedule states, and announcements use OKLCH tokens from `lib/live-updates-colors.ts` + `.live-updates-shell` CSS (coral/sand/lake family, not rainbow Tailwind); decorative blurs and ping rings removed for a quieter projection board. **`/install`:** flat `surface-tint` card headers (no gradient washes); completion steps use `text-success`. **`/silent`:** `.brand-dark-shell` tokenized dark UI. **`/map2026` (harden pass):** password gate has visible label, empty/incorrect errors with `role="alert"`, sign-in bypass link; registration and family-member fetches show retry on failure; search has sr-only label; empty list distinguishes no data vs no matches. **`/map2026`:** token surfaces, legend uses `destructive` / `primary` / `success`; mobile map uses `dvh`-based height so the attendee list stays reachable; clear/close controls and list rows are 44px touch targets. **Account profile** success/warning notices use `surface-highlight` / `surface-warm` + semantic tokens. **Email templates:** callout boxes use full borders (no side-stripe accents). shadcn `Button` defaults to `min-h-11`.

## Project structure

```
rendezvous-il/
├── app/              # Next.js routes (pages + API)
├── components/       # React UI
├── ios/              # Native iOS app (SwiftUI) — see ios/README.md
├── lib/db.ts         # Turso database client
├── scripts/          # Schema, verify, archived migration
├── docs/             # Setup guides
└── src/              # Legacy Vue static site (not deployed)
```

## iOS app

Native **SwiftUI** app in `ios/` (not a WebView shell):

- **Schedule** — week view, meals, worship leaders (from Turso-backed APIs)
- **Updates** — now/next, weather, announcements
- **More** — FAQ, About, Bible Bowl, cost calculator
- **App icon** — bundled in `ios/RendezvousIL/Resources/Assets.xcassets` (synced from `public/rendezvous-favicon.jpg` via `ios/scripts/sync-app-icon.sh`)

Setup: `cd ios && xcodegen generate && open RendezvousIL.xcodeproj` — see [ios/README.md](ios/README.md).

New API for clients: `GET /api/schedule` (canonical schedule JSON from `lib/schedule-data.ts`).

Account sign-in still opens Safari until Clerk iOS SDK is integrated. The website also supports **Add to Home Screen** via Safari ([`/install`](https://rendezvousil.com/install)).

## Contact

Stephen & Ranae Bradd  
824 W. Main St., Clinton, IL 61727  
(217) 935-5058 · Stephen@Bradd.us

Website: [rendezvousil.com](https://rendezvousil.com)  
Facebook: [facebook.com/groups/RendezvousIL](https://www.facebook.com/groups/RendezvousIL)
