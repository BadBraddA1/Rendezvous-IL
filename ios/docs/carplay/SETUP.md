# CarPlay setup (Rendezvous IL)

**Status (Jul 2026):** Apple approved the **CarPlay Driving Task** entitlement for team **F5HPRRCC5H** / App ID `com.rendezvousil.braddcorp.app`.

The app already includes the entitlement key, CarPlay scene, and schedule + Maps UI. Finish the portal/profile steps below, then ship a new build to TestFlight.

## 1. Enable on the App ID (do this once)

1. Open [Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Select **`com.rendezvousil.braddcorp.app`**.
3. Enable **CarPlay Driving Task** (or **CarPlay** → Driving Task) → Save.
4. If Xcode manages signing: open the project, select the **RendezvousIL** target → **Signing & Capabilities** → confirm **CarPlay Driving Task** appears (or click **+ Capability** and add it if needed).
5. Regenerate / refresh profiles: in Xcode, uncheck and recheck **Automatically manage signing**, or download updated profiles from [Profiles](https://developer.apple.com/account/resources/profiles/list).

## 2. Confirm the project (already done in repo)

`ios/RendezvousIL/RendezvousIL.entitlements` contains:

```xml
<key>com.apple.developer.carplay-driving-task</key>
<true/>
```

Also wired:

| Piece | Path |
|-------|------|
| Scene plist | `ios/RendezvousIL/Info.plist` (`CPTemplateApplicationSceneSessionRoleApplication`) |
| Delegate | `ios/RendezvousIL/CarPlay/CarPlaySceneDelegate.swift` |
| Schedule + Maps | `ios/RendezvousIL/CarPlay/CarPlayDataProvider.swift` |

## 3. Ship a TestFlight build

```bash
cd ios
# bump already applied in project.yml when shipping CarPlay
bash scripts/ship-testflight.sh
```

Install on a phone, connect to CarPlay (or Xcode Simulator → **I/O → External Displays → CarPlay**).

## 4. What CarPlay shows (v1)

- **Schedule** — today’s events during retreat week; outside the week, the next few upcoming items
- Tap an event → Apple Maps directions
- **Directions to Lake Williamson** — Maps handoff to campus

## 5. Out of scope (v1)

- In-car chat, Bible Bowl, turn-by-turn inside Rendezvous IL

## 6. Original request notes (historical)

Request category was **CarPlay driving task app**. Description used:

> Rendezvous IL helps families attending the Rendezvous Homeschool Family Retreat at Lake Williamson Christian Center. On CarPlay we show today’s retreat schedule and let the driver open Apple Maps for directions to the venue or the next gathering location. We do not provide turn-by-turn navigation inside the app, messaging, or audio playback on CarPlay. The experience is glanceable and uses list templates only.
