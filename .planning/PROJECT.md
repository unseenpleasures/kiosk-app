# ID Card Factory — Event Kiosk Catalogue App

## What This Is

A fully offline Progressive Web App (PWA) kiosk catalogue for The ID Card Factory, deployed on iPad Pros at UK comic cons and fan events. Customers browse 950+ custom printed ID cards, sign up for email updates, and scan a QR code to visit the website. The app is locked into kiosk mode via Apple Guided Access and requires internet only for pre-event catalogue syncing from Shopify.

## Core Value

Customers can browse and discover ID cards with zero friction — fast, visual, and fully offline — while the business captures emails and analytics data that persist across every event.

## Requirements

### Validated

**PWA & Offline (Phase 1: pwa-foundation)**
- [x] Service worker with cache-first strategy for app shell — Validated in Phase 1: pwa-foundation
- [x] App shell pre-cached on install — Validated in Phase 1: pwa-foundation
- [x] manifest.json: standalone display, landscape orientation, dark theme, 512×512 and 1024×1024 icons — Validated in Phase 1: pwa-foundation
- [x] Home screen load < 2 seconds from cache — Validated in Phase 1: pwa-foundation (requires human test on A9X hardware)

**Data Layer & Navigation (Phase 2: data-layer-and-navigation)**
- [x] IndexedDB schema with 4 object stores (products, emails, analytics, sync_meta) — Validated in Phase 2: data-layer-and-navigation
- [x] Promise-wrapped CRUD helpers (openDB, dbGet, dbPut, dbDelete, dbCount, dbGetAll, dbGetAllByIndex, dbClear) — Validated in Phase 2: data-layer-and-navigation
- [x] localStorage config wrapper with SHA-256 passcode hashing via Web Crypto API — Validated in Phase 2: data-layer-and-navigation
- [x] Hash-based SPA router with all 5 route patterns — Validated in Phase 2: data-layer-and-navigation
- [x] Inactivity timer with 10-second countdown overlay and pause/resume API — Validated in Phase 2: data-layer-and-navigation
- [x] Persistent QR code (non-interactive div) and floating home button on every screen — Validated in Phase 2: data-layer-and-navigation

### Active

**Catalogue (Customer-Facing)**
- [ ] Full-screen thumbnail grid displaying all 950+ cards with lazy loading
- [ ] Category filter for 8 categories: Anime & Manga, Film & Cinema, Gaming, Horror, Novelty, UK TV, US & World TV, Law & Services
- [ ] Real-time search by card name/character with all queries logged (including zero-result searches)
- [ ] "NEW" badge on cards added since last sync
- [ ] 3-minute inactivity grace period on email form

**Email Capture**
- [ ] Dedicated email sign-up screen (not a popup) accessible from anywhere
- [ ] Email + mandatory GDPR consent checkbox only
- [ ] Every captured email tagged with event name and date
- [ ] All emails stored in IndexedDB (offline, persistent)
- [ ] One-tap CSV export from admin panel (Mailchimp-ready)

**Analytics & Tracking**
- [ ] Card view logging with timestamp
- [ ] Category browsing tracking
- [ ] Search term logging with zero-result searches flagged separately
- [ ] Post-event summary in admin: top 10 cards, most searched terms, zero-result searches, emails captured
- [ ] Cumulative data persists across events

**Admin Panel (Passcode Protected)**
- [ ] Hidden/discreet trigger + passcode access
- [ ] Set event name and date before each show
- [ ] One-button Shopify Storefront API sync with progress indicator and status report
- [ ] Incremental sync (only new/changed products downloaded)
- [ ] Export current event email list as tagged CSV
- [ ] In-app analytics summary
- [ ] Adjustable inactivity timer (default 60 seconds)
- [ ] Changeable admin passcode

**PWA & Offline**
- [ ] Service worker with cache-first strategy for all product images and JSON (Phase 1 covers app shell; product images covered in Phase 2+)
- [ ] Search results < 300ms
- [ ] Category filter < 100ms

### Out of Scope

- Native iOS app — PWA via Safari + Guided Access is sufficient and avoids App Store fees
- Real-time sync during events — offline-first design, sync happens at home pre-event
- Server-side data storage — all data on-device until manually exported
- OAuth or multi-user authentication — single admin passcode is sufficient
- Push notifications — out of scope for kiosk context
- Video content — storage/bandwidth costs, not relevant to card catalogue

## Context

- **Platform**: iPadOS 16, Safari, PWA installed to home screen via "Add to Home Screen"
- **Primary device**: iPad Pro 12.9" 1st Gen (A1652, A9X chip) — older hardware, performance targets set accordingly
- **Kiosk lockdown**: Apple Guided Access (OS-level) + app-level admin passcode (two layers)
- **Data source**: Shopify Storefront API (read-only, free tier) — `unauthenticated_read_product_listings` scope
- **Product scale**: 951 products as of March 2026, paginated 50 at a time via GraphQL cursor
- **Image strategy**: Fetch compressed images (~400px wide) during sync, estimated total 200–400MB
- **Branding reference**: https://theidcardfactory.co.uk — dark navy/black base, gold accent
- **Category structure**: Anime & Manga / Film & Cinema / Gaming / Horror / Novelty / UK TV / US & World TV / Law & Services

## Constraints

- **Tech Stack**: Vanilla HTML/CSS/JS PWA — no build tools, no frameworks, no App Store. Must run in Safari on iPadOS 16.
- **Compatibility**: iPad Pro 12.9" 1st Gen (A9X chip), iPadOS 16 maximum. No features requiring newer iOS.
- **Performance**: A9X chip is 2015-era hardware. Bundle size, animation complexity, and memory usage must be constrained accordingly.
- **Offline**: Zero network dependency during events. All data must be pre-cached. No CDN fonts, no remote assets.
- **Storage**: IndexedDB for persistent data. localStorage for small config. Service worker cache for app shell + product assets.
- **GDPR**: Explicit opt-in checkbox mandatory on email capture. Data stays on-device until owner exports CSV.
- **Security**: Shopify Storefront API token is public/read-only by design — safe to include in client-side code. Admin passcode stored hashed in localStorage.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native app | No App Store fees, no annual developer account, iPadOS 16 fully supports PWA + Guided Access | Implemented Phase 1 |
| Vanilla JS over framework | No build toolchain, no node_modules, simpler deployment — serve directly from filesystem | Implemented Phase 1 |
| No arrow functions in sw.js | Safari SW compatibility — older Safari versions had issues parsing arrow functions in SW context | Implemented Phase 1 |
| Shopify Storefront API | Free, read-only, built into every Shopify store — no custom backend needed | — Pending |
| IndexedDB for all persistent data | Browser-native, offline-capable, handles large datasets (950+ products + images metadata) | Implemented Phase 2 |
| Shopify token in client code | Token is read-only and unauthenticated — Shopify's intended use case for storefronts | — Pending |
| ES2017 syntax constraint in all modules | A9X chip / Safari 16.x safe upper bound — no arrow functions, no optional chaining, no nullish coalescing | Implemented Phase 2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-21 after Phase 2: data-layer-and-navigation complete*
