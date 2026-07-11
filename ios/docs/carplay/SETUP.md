# CarPlay setup (Rendezvous IL)

CarPlay is a **managed Apple entitlement**. Device/TestFlight CarPlay only works after Apple grants `com.apple.developer.carplay-driving-task` to team **F5HPRRCC5H** for App ID `com.rendezvousil.braddcorp.app`.

## 1. Submit the entitlement request (required)

1. Open [Apple CarPlay contact](https://developer.apple.com/contact/carplay/) (or [developer.apple.com/carplay](https://developer.apple.com/carplay)).
2. Agree to the **CarPlay Entitlement Addendum**.
3. Request category: **CarPlay driving task app**
4. App: **Rendezvous IL** — bundle ID `com.rendezvousil.braddcorp.app`
5. Description to paste:

> Rendezvous IL helps families attending the Rendezvous Homeschool Family Retreat at Lake Williamson Christian Center. On CarPlay we show today’s retreat schedule and let the driver open Apple Maps for directions to the venue or the next gathering location. We do not provide turn-by-turn navigation inside the app, messaging, or audio playback on CarPlay. The experience is glanceable and uses list templates only.

6. Wait for Apple to attach the managed capability (can take days–weeks).

## 2. After Apple approves

1. [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → App ID `com.rendezvousil.braddcorp.app` → enable **CarPlay Driving Task**.
2. Regenerate Development / Distribution profiles and refresh in Xcode.
3. Confirm `ios/RendezvousIL/RendezvousIL.entitlements` contains:

```xml
<key>com.apple.developer.carplay-driving-task</key>
<true/>
```

4. Build to a physical iPhone connected to CarPlay (or Xcode → I/O → External Displays → CarPlay for Simulator).

## 3. What the app shows (v1)

- **Schedule** — today’s events during retreat week (title, time, location); outside the week, the next few upcoming items
- Tap an event → Apple Maps directions (venue / location text)
- **Directions to Lake Williamson** — Maps handoff to campus

## 4. Out of scope (v1)

- In-car chat, Bible Bowl, turn-by-turn inside Rendezvous IL

## 5. Code map

| Piece | Path |
|-------|------|
| Entitlement | `ios/RendezvousIL/RendezvousIL.entitlements` |
| Scene plist | `ios/RendezvousIL/Info.plist` (`UIApplicationSceneManifest`) |
| Delegate | `ios/RendezvousIL/CarPlay/CarPlaySceneDelegate.swift` |
| Schedule + Maps | `ios/RendezvousIL/CarPlay/CarPlayDataProvider.swift` |

## 6. Simulator

Xcode → **I/O → External Displays → CarPlay** while the iOS Simulator is running.
