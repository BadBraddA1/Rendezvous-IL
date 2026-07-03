# TestFlight smoke checklist

Run on a physical device after each TestFlight build.

## Launch & auth
1. Cold launch → welcome screen (no crash)
2. Sign in → five tabs visible
3. Sign out → welcome screen

## Tabs
4. **Home** — greeting, shortcuts load
5. **Schedule** — day picker, events, bell reminder sheet opens
6. **Updates** — announcements / weather or empty state
7. **Chat** — channel list or empty state (no crash)
8. **More** — profile header, links

## Community
9. More → **Family directory** — loads or friendly error
10. More → **Your directory photo** — settings load
11. More → **Family account** — web links present

## Notifications & polish
12. More → **Notifications & widgets** — permission status, toggles
13. Tap a **widget** (if installed) → opens Schedule tab
14. Organizer push (if sent) → opens in-app tab, not Safari

## Staff (role-gated)
15. Admin → dashboard loads or access denied
16. Check-in → station loads or access denied
