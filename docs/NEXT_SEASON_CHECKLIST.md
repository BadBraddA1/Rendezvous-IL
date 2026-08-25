# Next season checklist (Rendezvous IL)

Use this when flipping the site/apps from one event year to the next
(e.g. **2027 → 2028**). Do these **before** families start registering for the
new year.

## Year chat group (easy to miss)

**2027 lesson:** the year group chat did **not** auto-appear for people until
the `year-{YYYY}` channel existed and membership sync could attach them. Fix it
up front next time — don’t wait for “why isn’t chat there?”

1. Add the new year to `lib/registration-event-years.ts`
   (`REGISTRATION_EVENT_YEARS`, `DEFAULT_REGISTRATION_EVENT_YEAR`,
   `parseRegistrationEventYear`).
2. Confirm `ensureChatSchema()` seeds `year-{YYYY}` into `chat_channels`
   (it loops `REGISTRATION_EVENT_YEARS` — hit any chat/admin chat route once
   after deploy, or create the channel in **Admin → Year Chat** if missing).
3. Confirm registrants get membership via `syncYearChannelMembership`
   (`lib/chat/channels.ts`) when they sign in / open chat after registering.
4. Spot-check: register a test family for the new year → they see
   **Rendezvous {YYYY} Chat** without a manual member add.

Year channels are meant to **auto-include** registered families; custom/test
channels stay manual.

## Also bump / seed

- [ ] Admin dash default year + archive prior year (storage key bump if sticky prefs)
- [ ] Schedule: retreat week + **key dates** (reg opens/closes) via Admin → Schedule tools
- [ ] Rates / calculator for the new year
- [ ] Directory year visibility toggles on `/admin`
- [ ] Song packs / home board / special assignments / lesson topics for the year
- [ ] Site copy, OG, countdown, attendance history as needed
- [ ] iOS/Android schedule + chat smoke on a device build

## After go-live

- [ ] Archive prior year in admin pickers (label as archive; keep data)
- [ ] Leave prior `year-{old}` chat available for returning families
