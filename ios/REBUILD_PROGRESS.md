# Rebuild progress

**Current phase:** 5 — Chat + Directory  

## Phase status

- [x] **0** Launch crash fix (Clerk timeout, deferred Live Activity, safe bootstrap)
- [x] **1** Foundation shell (`AppShell`, `AppBootstrapState`, debug logging)
- [x] **2** Auth gate (`ClerkAuthSheet` at root only, `SignInPromptCard`, sign-out handling)
- [x] **3** Data layer (offline-first schedule, disk cache, fetch timeouts, `bootstrap()`)
- [x] **4** Schedule + Updates (today picker, shared now/next, reminders, loading states)
- [ ] **5** Chat + Directory
- [ ] **6** Account + More
- [ ] **7** Staff admin
- [ ] **8** Polish (push/widgets)
- [ ] **9** TestFlight ship

## Notes

- 2026-07-03: User reports crash on every open (build 11). Phase 0 started.
