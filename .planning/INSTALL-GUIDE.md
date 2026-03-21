# iPad Installation and Kiosk Setup Guide

## Prerequisites

- Both iPads are iPad Pro 12.9" 1st Gen (A1652, A9X chip) running iPadOS 16
- WiFi connection available for initial setup (the app works offline after first sync)
- PWA is live at `https://unseenpleasures.github.io/kiosk-app/`

---

## Install PWA on iPad (repeat for each iPad)

1. Open **Safari** on the iPad (MUST be Safari — Chrome/Firefox will not install as a standalone PWA on iPadOS)
2. Navigate to `https://unseenpleasures.github.io/kiosk-app/`
3. Wait for the app to fully load — the service worker needs a few seconds to cache all assets on first visit
4. Tap the **Share button** (box with upward arrow, in the Safari toolbar)
5. Scroll down in the share sheet and tap **"Add to Home Screen"**
6. Optionally edit the name (default: "ID Cards"), then tap **"Add"**
7. The app icon appears on the home screen

---

## Verify Installation

1. Tap the app icon on the home screen
2. The app should launch in **standalone mode** — no Safari address bar or navigation controls visible
3. The app should show the catalogue screen (or sync prompt if no products cached)
4. If this is the first launch, ensure WiFi is on — the app needs to perform an initial Shopify product sync
5. After sync completes, verify products appear in the catalogue grid
6. Put the iPad into airplane mode and verify the app still loads and browses correctly (offline test)

---

## Configure Guided Access (Kiosk Lockdown)

### One-time setup per iPad

1. Go to **Settings > Accessibility > Guided Access**
2. Toggle **Guided Access** to ON
3. Tap **Passcode Settings** > **Set Guided Access Passcode** — set a memorable passcode
4. Optional: Under **Time Limits**, set a sound or spoken warning if desired

### Per-event activation

1. Launch the kiosk PWA from the home screen
2. **Triple-press the Home button** (iPad Pro 12.9" 1st Gen has a physical Home button)
3. Guided Access options appear — optionally circle screen areas to disable touch
4. Tap **Start** (top-right corner)
5. The app is now locked — customers cannot exit or switch apps

### Exit Guided Access

1. **Triple-press the Home button**
2. Enter the Guided Access passcode
3. Tap **End** (top-left corner)

---

## Pre-Event Checklist

- [ ] WiFi connected
- [ ] Open app and trigger Shopify sync from admin panel (Admin > Sync Products)
- [ ] Verify new products appear in the catalogue
- [ ] Set the event name in admin (Admin > Settings > Event Name)
- [ ] Clear email list if needed (Admin > Emails > Export first, then clear)
- [ ] Enable Guided Access on each iPad
- [ ] Verify both iPads are charged or plugged in

---

## Post-Event Checklist

- [ ] Exit Guided Access on each iPad
- [ ] Export email signups as CSV (Admin > Emails > Export CSV)
- [ ] Note analytics (Admin > Analytics) for event review
- [ ] Optional: clear analytics data for next event
