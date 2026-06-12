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

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm db:verify` | List Turso tables and row counts |

## Design & motion

Brand and UI context: `PRODUCT.md`, `DESIGN.md`. Marketing surfaces polished: lake-teal OKLCH palette, Libre Baskerville + Libre Franklin, mobile safe-areas, accessible focus rings, semantic success/warning tokens. `/schedule` uses the same layout utilities (`.site-container`, `.text-page-title`), token-based day sections, sticky day nav with `aria-current`, and an accessible venue-map dialog (Escape to close, backdrop dismiss). `/faq` matches the system: editorial two-column accordion, `.measure-prose` answers, linked cost calculator / Bible Bowl / contact paths, and homepage-aligned video cards. `/calculator` uses the same shell (`.site-container`, safe-area offset, `#main-content`), token borders, tile-style lodging radios with 44px targets, `surface-highlight` estimate panel (no gradient), and `aria-live` on the running total. `/registration` shares `components/registration-open-countdown.tsx` with the homepage banner — countdown targets **Jan 1, 2027** (not event start), includes email notify + links to calculator/FAQ, and shows a `surface-lake` open-state CTA when registration opens. Post-audit hardening: venue map dialog uses `lib/use-focus-trap.ts`; schedule map + weather use lake-teal tokens; biblebowl/privacy/scrabble routes use `#main-content` + `.site-container`. Run `pnpm dev` and open `/registration` or `/schedule` to preview.

## Project structure

```
rendezvous-il/
├── app/              # Next.js routes (pages + API)
├── components/       # React UI
├── lib/db.ts         # Turso database client
├── scripts/          # Schema, verify, archived migration
├── docs/             # Setup guides
└── src/              # Legacy Vue static site (not deployed)
```

## Contact

Stephen & Ranae Bradd  
824 W. Main St., Clinton, IL 61727  
(217) 935-5058 · Stephen@Bradd.us

Website: [rendezvousil.com](https://rendezvousil.com)  
Facebook: [facebook.com/groups/RendezvousIL](https://www.facebook.com/groups/RendezvousIL)
