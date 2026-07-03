# Rebuild progress

**Current phase:** 7 — Staff admin  

## Phase status

- [x] **0** Launch crash fix (Clerk timeout, deferred Live Activity, safe bootstrap)
- [x] **1** Foundation shell (`AppShell`, `AppBootstrapState`, debug logging)
- [x] **2** Auth gate (`ClerkAuthSheet` at root only, `SignInPromptCard`, sign-out handling)
- [x] **3** Data layer (offline-first schedule, disk cache, fetch timeouts, `bootstrap()`)
- [x] **4** Schedule + Updates (today picker, shared now/next, reminders, loading states)
- [x] **5** Chat + Directory (Ably optional realtime, timeouts, directory refresh, photo compress)
- [x] **6** Account + More (profile header, account links, FAQ search, notification UX)
- [ ] **7** Staff admin
- [ ] **8** Polish (push/widgets)
- [ ] **9** TestFlight ship

## Notes

- 2026-07-03: User reports crash on every open (build 11). Phase 0 started.
- 2026-07-03: Phase 5 — chat loads with retry/timeout; thread works without Ably (banner + pull refresh); directory pull-to-refresh, toolbar photo link, JPEG resize before upload.
- 2026-07-03: Phase 6 — More profile header, Account web links + refresh, FAQ search, notification permission flow, cost calculator in More.
