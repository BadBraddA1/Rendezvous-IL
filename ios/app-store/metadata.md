# App Store Connect — Rendezvous IL

Paste these into **App Store Connect → Rendezvous IL → App Information / version 2.0.1**.

| Field | Value |
| --- | --- |
| **Name** | Rendezvous IL |
| **Subtitle** (30 chars max) | Retreat schedule & community |
| **Marketing URL** | https://rendezvousil.com |
| **Support URL** | https://rendezvousil.com/about |
| **Privacy Policy URL** | https://rendezvousil.com/privacy |
| **User Privacy Choices URL** | *(leave blank)* |

## Keywords

100 characters max, comma-separated, no spaces after commas:

```
rendezvous,retreat,homeschool,schedule,directory,chat,family,church,illinois,event
```

(Character count: 96)

## Description

```
Rendezvous IL is the companion app for families attending the Rendezvous Homeschool Family Retreat at Lake Williamson Christian Center.

Sign in with the same account you use on rendezvousil.com to unlock everything you need during retreat week:

• Schedule — daily program, meals, worship leaders, and live updates (now/next, weather, announcements)
• Chat — year-group conversations with photos, announcements, and push notifications
• Family directory — browse registered families and manage your directory photo
• Check-in tools — for staff with the Check-In role (QR scan and family lookup)
• Admin dashboard — for organizers (stats, quick links, user management)

Stay on top of the day with event reminders, optional lock-screen Live Activities during retreat week, and home-screen widgets for now/next.

This app is for registered Rendezvous families and staff. Registration and payments stay on the website.

Questions? Contact Stephen@Bradd.us or visit rendezvousil.com.
```

## Promotional text (optional, 170 chars — can change without a new review)

```
Your Rendezvous retreat companion: schedule, live updates, year chat, and family directory — all in one place.
```

## What's New (2.0.1)

```
• Channel moderators and chat photos
• Live Updates photoshow for room displays
• Admin dashboard reliability fixes
• Schedule tab with live updates, QR check-in, and polish
```

## Review notes (for App Review)

```
Sign in with a TestFlight / review account that has a registration linked on rendezvousil.com.

Demo path without staff roles:
1. Sign in
2. Open Schedule (center tab) for the program and live updates
3. Open Chat for year channels
4. Open Directory for family listings

Staff check-in and Admin appear under More only for accounts with those roles.

Support: Stephen@Bradd.us · (217) 935-5058
Privacy: https://rendezvousil.com/privacy
```

## Screenshots

**iPhone** — from the `ios/` folder:

```bash
bash scripts/capture-app-store-screenshots.sh
```

PNGs are written to `ios/AppStoreScreenshots/` (iPhone 6.9″, 1320×2868). Upload under **Previews and Screenshots → iPhone 6.9" Display**.

**iPad 13-inch (required)** — App Store Connect blocks submission without these:

```bash
bash scripts/capture-app-store-screenshots-ipad.sh
```

PNGs → `ios/AppStoreScreenshots-iPad/` (**2064×2752**). Upload under **Previews and Screenshots → iPad 13" Display**.

The script opens Finder when finished. If a frame looks blank, re-run the script or capture that tab in Xcode (see `ios/README.md`).
