# Rendezvous iOS — ground-up rebuild phases

Attendee community hub for registered families. Each phase ends with a **simulator build** and a checkbox in `REBUILD_PROGRESS.md`.

| Phase | Goal | Deliverable |
|-------|------|-------------|
| **0** | **Stop the bleeding** — app opens without crashing | Clerk timeout, safe bootstrap, deferred Live Activity, error UI |
| **1** | **Foundation** — single app shell, env injection, logging | `AppShell`, `withAppEnvironments`, bootstrap state machine |
| **2** | **Auth gate** — login-first UX (Pew Packers pattern) | `WelcomeHubView`, sheet Clerk only at root, sign-out flow |
| **3** | **Data layer** — API + offline schedule | `RendezvousRepository` hardened, bundled fallback always works |
| **4** | **Retreat tabs** — Schedule + Updates | Day picker, now/next, weather, announcements, reminders |
| **5** | **Community** — Chat + Directory | Ably thread, family directory, photo upload |
| **6** | **Account & More** — profile, resources, settings | Account links, Bible Bowl/FAQ, notifications |
| **7** | **Staff** — admin + check-in (role-gated) | Dashboard, users, check-in station |
| **8** | **Polish** — deep links, push, widgets, Live Activity | Only after core stable |
| **9** | **Ship** — TestFlight build, smoke checklist | Archive, upload, README |

## Rules

- One phase per loop tick unless blocked.
- No new features in a phase — only that phase’s scope.
- Crash on launch → stay in Phase 0 until sim launch is clean.
- Commit at end of each phase with message `ios rebuild phase N: <summary>`.

## Smoke checklist (every phase)

1. Cold launch → welcome or home (no crash)
2. Sign in → tabs visible
3. Tap each tab once
4. More → Directory, Account (NavigationLink)
5. Sign out → welcome
