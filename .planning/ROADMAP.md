# Roadmap: ID Card Factory — Event Kiosk Catalogue App

**Milestone:** v1 — Event-Ready Kiosk
**Created:** 2026-03-21
**Granularity:** Standard
**Coverage:** 36/36 requirements mapped

## Phases

- [x] **Phase 1: PWA Foundation** - Installable offline shell with boot health check and kiosk lockdown (completed 2026-03-21)
- [x] **Phase 2: Data Layer and Navigation** - IndexedDB schema, hash router, inactivity timer, global UI chrome (completed 2026-03-21)
- [x] **Phase 3: Sync Engine** - Shopify catalogue sync with cursor checkpointing, progress UI, and admin sync panel (completed 2026-03-21)
- [x] **Phase 4: Customer Browse Experience** - Virtual-scrolled catalogue grid, search, filter, card detail, and analytics logging (completed 2026-03-21)
- [ ] **Phase 5: Email Capture and Export** - GDPR-compliant email sign-up, per-event tagging, and CSV export
- [ ] **Phase 6: Admin Polish and Analytics** - Analytics summary, admin configuration, passcode change, cumulative data

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. PWA Foundation | 2/2 | Complete   | 2026-03-21 |
| 2. Data Layer and Navigation | 2/2 | Complete   | 2026-03-21 |
| 3. Sync Engine | 2/2 | Complete   | 2026-03-21 |
| 4. Customer Browse Experience | 2/2 | Complete   | 2026-03-21 |
| 5. Email Capture and Export | 0/? | Not started | - |
| 6. Admin Polish and Analytics | 0/? | Not started | - |

---

## Phase Details

### Phase 1: PWA Foundation
**Goal**: The app installs to the iPad home screen, loads from cache, survives offline, and detects storage eviction before the kiosk is put in front of attendees.
**Depends on**: Nothing (first phase)
**Requirements**: PWA-01, PWA-02, PWA-04, PWA-05
**Success Criteria** (what must be TRUE):
  1. Tapping the home screen icon opens the app in standalone mode (no Safari browser chrome) with landscape orientation and the correct dark theme
  2. With no network connection, the app shell loads fully — no broken screens, no network errors visible
  3. On launch with an empty or evicted IndexedDB, a "Sync required" blocking screen appears before any catalogue content
  4. On launch with data present, the home screen renders in under 2 seconds from cache on the target A9X hardware
  5. The installed app icon displays correctly at both 512x512 and 1024x1024 resolutions on the iPad home screen
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md — Project scaffolding: assets, manifest, HTML shell, CSS foundation
- [x] 01-02-PLAN.md — Service worker, boot health check, and screen rendering

### Phase 2: Data Layer and Navigation
**Goal**: Every subsequent feature has a working foundation — persistent storage schema, hash-based navigation, inactivity timer, and the global UI chrome that appears on every screen.
**Depends on**: Phase 1
**Requirements**: PWA-03, PWA-06, CAT-07, CAT-08, CAT-09
**Success Criteria** (what must be TRUE):
  1. The QR code linking to https://theidcardfactory.co.uk is visible on every screen and tapping it does not navigate away from the app
  2. The floating home button is visible in the top-left on every screen; tapping it returns to the catalogue root and resets any active search or filter
  3. After 60 seconds of no input, a 10-second visible countdown appears; if not dismissed, the app returns to the home screen
  4. The admin passcode and app configuration values (event name, event date, timer setting) persist across app restarts
  5. All IndexedDB object stores (products, emails, analytics, sync metadata) are created and accessible without errors on a fresh install
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — IndexedDB schema with CRUD helpers (db.js) and localStorage config wrapper with SHA-256 hashing (config.js)
- [x] 02-02-PLAN.md — Hash router, inactivity timer, global chrome elements, and boot sequence refactor

### Phase 3: Sync Engine
**Goal**: An admin can reliably download the full 950+ product catalogue from Shopify onto the device before an event, with transparent progress and safe failure recovery.
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. The admin panel is unreachable without the correct passcode; the entry trigger is not obvious to casual attendees
  2. Admin can set the event name and date in the admin panel; these values are saved and survive app restart
  3. Tapping "Sync" in the admin panel shows a live progress indicator (page count and/or percentage) while the 20+ GraphQL pages are fetched
  4. When sync completes, a status report shows the total products downloaded, number of new cards added, and any errors encountered
  5. If sync is interrupted mid-way (e.g., network drops at page 15), the previously cached catalogue remains fully browsable — no data loss
  6. After a successful sync, all product images and metadata are available with no network connection
**Plans**: 2 plans
Plans:
- [x] 03-01-PLAN.md — Shopify sync engine with cursor pagination, image caching, and progress callbacks
- [x] 03-02-PLAN.md — Admin panel with passcode gate, event config, sync trigger, and wiring

### Phase 4: Customer Browse Experience
**Goal**: Attendees can discover any of the 950+ cards quickly — by browsing, filtering, or searching — with every interaction logged silently in the background.
**Depends on**: Phase 3
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-10, ANALYTICS-01, ANALYTICS-02, ANALYTICS-03
**Success Criteria** (what must be TRUE):
  1. The catalogue grid scrolls smoothly through all 950+ cards on A9X hardware with no visible jank; the DOM never holds more than ~80 card nodes simultaneously
  2. Tapping any of the 8 category chips filters the visible cards in under 100ms with no page reload
  3. Typing in the search field shows matching cards in under 300ms; searches that return zero results are visually indicated and logged separately
  4. Tapping a card opens a full-screen detail view showing the larger card image and card name
  5. Cards added since the last sync display a "NEW" badge in both the grid and detail views
  6. The email sign-up form has a 3-minute inactivity grace period — the 60-second idle countdown does not interrupt an attendee mid-entry on that screen
**Plans**: 2 plans
Plans:
- [x] 04-01-PLAN.md — Catalogue module with virtual scroll grid, search, category filter, and analytics
- [x] 04-02-PLAN.md — Card detail view, router wiring, home button reset, and idle email grace period

### Phase 5: Email Capture and Export
**Goal**: Attendees can sign up for email updates with proper GDPR consent, and the business owner can export every event's captured emails ready for Mailchimp import.
**Depends on**: Phase 2
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05
**Success Criteria** (what must be TRUE):
  1. The email sign-up screen is reachable from any screen in the app with a single tap
  2. The consent checkbox is unchecked by default; the submit button remains disabled until the checkbox is ticked
  3. After successful submission, a confirmation screen displays briefly and then returns to the catalogue automatically after 5 seconds
  4. Submitted emails are stored offline in IndexedDB tagged with event name, event date, and a consent timestamp — data survives app restart and device power cycle
  5. From the admin panel, one tap exports the current event's email list as a CSV file formatted for Mailchimp import
**Plans**: TBD

### Phase 6: Admin Polish and Analytics
**Goal**: The business owner has the operational tools to configure each event, understand what customers are interested in, manage the app reliably, and accumulate intelligence across every event.
**Depends on**: Phase 4, Phase 5
**Requirements**: ADMIN-05, ADMIN-06, ANALYTICS-04, ANALYTICS-05
**Success Criteria** (what must be TRUE):
  1. The admin event summary shows the top 10 most-viewed cards, most-searched terms, zero-result searches, and total emails captured — all scoped to the current event
  2. Analytics data from previous events is preserved in IndexedDB and does not get overwritten when a new event is configured
  3. Admin can change the idle inactivity timeout from within the admin panel; the new value takes effect immediately on the kiosk
  4. Admin can change the passcode by entering the current passcode first; the new hashed passcode is saved without requiring a full sync
**Plans**: TBD

---

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| PWA-01 | Phase 1 |
| PWA-02 | Phase 1 |
| PWA-04 | Phase 1 |
| PWA-05 | Phase 1 |
| PWA-03 | Phase 2 |
| PWA-06 | Phase 2 |
| CAT-07 | Phase 2 |
| CAT-08 | Phase 2 |
| CAT-09 | Phase 2 |
| SYNC-01 | Phase 3 |
| SYNC-02 | Phase 3 |
| SYNC-03 | Phase 3 |
| SYNC-04 | Phase 3 |
| ADMIN-01 | Phase 3 |
| ADMIN-02 | Phase 3 |
| ADMIN-03 | Phase 3 |
| ADMIN-04 | Phase 3 |
| CAT-01 | Phase 4 |
| CAT-02 | Phase 4 |
| CAT-03 | Phase 4 |
| CAT-04 | Phase 4 |
| CAT-05 | Phase 4 |
| CAT-06 | Phase 4 |
| CAT-10 | Phase 4 |
| ANALYTICS-01 | Phase 4 |
| ANALYTICS-02 | Phase 4 |
| ANALYTICS-03 | Phase 4 |
| EMAIL-01 | Phase 5 |
| EMAIL-02 | Phase 5 |
| EMAIL-03 | Phase 5 |
| EMAIL-04 | Phase 5 |
| EMAIL-05 | Phase 5 |
| ADMIN-05 | Phase 6 |
| ADMIN-06 | Phase 6 |
| ANALYTICS-04 | Phase 6 |
| ANALYTICS-05 | Phase 6 |

**Coverage: 36/36 requirements mapped. No orphans.**

---
*Roadmap created: 2026-03-21*
*Last updated: 2026-03-21 after Phase 4 planning*
